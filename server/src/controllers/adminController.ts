import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Helper to log admin actions
async function recordAuditLog(adminId: string, action: string, targetEntity: string, targetId?: string, details?: string) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetEntity,
        targetId: targetId || null,
        details: details || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function getAdminOverview(req: AuthenticatedRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      travelersCount,
      totalDestinations,
      totalIncidents,
      pendingCount,
      verifiedCount,
      rejectedCount,
      totalCommunityPosts,
      totalScamReports,
      pendingFareCount,
      verifiedFareCount,
      highRiskZones,
      recentEmergencyLogs,
      pendingIncidents,
      pendingFareReports,
      pendingRiskAlerts,
      pendingRoadReports,
      openLostFound,
      verifiedServices,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TRAVELER', isActive: true } }),
      prisma.city.count(),
      prisma.incidentReport.count(),
      prisma.incidentReport.count({ where: { status: 'PENDING' } }),
      prisma.incidentReport.count({ where: { status: { in: ['VERIFIED', 'ADMIN_VERIFIED'] } } }),
      prisma.incidentReport.count({ where: { status: 'REJECTED' } }),
      prisma.communityPost.count(),
      prisma.scamReport.count(),
      prisma.fareReport.count({ where: { verificationStatus: { in: ['PENDING', 'COMMUNITY_VERIFIED'] } } }),
      prisma.fareReport.count({ where: { verificationStatus: { in: ['VERIFIED', 'ADMIN_VERIFIED'] } } }),
      prisma.safetyZone.findMany({
        where: { riskTier: { in: ['HIGH_RISK', 'MODERATE'] } },
        include: { city: true },
      }),
      prisma.emergencyLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.incidentReport.findMany({
        where: { status: 'PENDING' },
        include: { city: true, reporter: { select: { name: true, email: true } } },
        orderBy: { reportedAt: 'desc' },
      }),
      prisma.fareReport.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { city: true, transportMode: true },
      }),
      prisma.travelRiskAlert.count({
        where: { verificationStatus: 'PENDING' },
      }),
      prisma.roadCrowdReport.count({
        where: { status: 'PENDING' },
      }),
      prisma.lostFoundItem.count({
        where: { status: 'OPEN' },
      }),
      prisma.locationService.count({
        where: { isVerified: true },
      }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        activeUsers: travelersCount,
        totalDestinations,
        totalIncidents,
        pendingReports: pendingCount,
        verifiedReports: verifiedCount,
        rejectedReports: rejectedCount,
        communityPosts: totalCommunityPosts,
        reportedContent: pendingCount + totalScamReports,
        pendingFareReports: pendingFareCount,
        verifiedFareReports: verifiedFareCount,
        pendingRiskAlerts,
        pendingRoadReports,
        openLostFound,
        verifiedServices,
      },
      highRiskZones,
      recentEmergencyLogs,
      pendingIncidents,
      pendingFareReports,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin overview' });
  }
}

export async function getAdminUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { search, role, status } = req.query;

    const where: any = {};
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && typeof role === 'string' && role !== 'ALL') {
      where.role = role;
    }
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.isActive = status === 'ACTIVE';
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        role: true,
        authProvider: true,
        reputationScore: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            trips: true,
            incidents: true,
            communityPosts: true,
          },
        },
      },
    });

    return res.json({ users });
  } catch (error) {
    console.error('getAdminUsers error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user?.id;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Boolean isActive flag is required' });
    }

    if (adminId && id === adminId && isActive === false) {
      return res.status(400).json({ error: 'Administrators cannot suspend their own account' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        isActive ? 'REACTIVATE_USER' : 'SUSPEND_USER',
        'USER',
        id,
        `User ${updated.email} account status set to ${isActive ? 'Active' : 'Suspended'}`
      );
    }

    return res.json({
      message: `User ${isActive ? 'reactivated' : 'suspended'} successfully`,
      user: updated,
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user?.id;

    if (!['TRAVELER', 'MODERATOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        'UPDATE_USER_ROLE',
        'USER',
        id,
        `User ${updated.email} role updated to ${role}`
      );
    }

    return res.json({
      message: `User role changed to ${role}`,
      user: updated,
    });
  } catch (error) {
    console.error('updateUserRole error:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
}

export async function getAdminIncidents(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, cityId } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      if (status === 'VERIFIED' || status === 'ADMIN_VERIFIED') {
        where.status = { in: ['VERIFIED', 'ADMIN_VERIFIED'] };
      } else {
        where.status = status;
      }
    }
    if (cityId && typeof cityId === 'string' && cityId !== 'ALL') {
      where.cityId = cityId;
    }

    const incidents = await prisma.incidentReport.findMany({
      where,
      orderBy: { reportedAt: 'desc' },
      include: {
        city: true,
        reporter: {
          select: { id: true, name: true, email: true, reputationScore: true },
        },
      },
    });

    return res.json({ incidents });
  } catch (error) {
    console.error('getAdminIncidents error:', error);
    return res.status(500).json({ error: 'Failed to retrieve incidents' });
  }
}

export async function reviewIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // 'APPROVE' | 'REJECT'
    const adminId = req.user?.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const incident = await prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found' });
    }

    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
    const newConfidence = action === 'APPROVE' ? Math.max(incident.confidenceScore, 96) : 0;

    const updated = await prisma.incidentReport.update({
      where: { id },
      data: {
        status: newStatus,
        confidenceScore: newConfidence,
      },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        action === 'APPROVE' ? 'VERIFY_INCIDENT' : 'REJECT_INCIDENT',
        'INCIDENT',
        id,
        notes || `Incident "${incident.title}" marked as ${newStatus}`
      );
    }

    return res.json({
      message: `Incident marked as ${newStatus}`,
      incident: updated,
    });
  } catch (error) {
    console.error('Review incident error:', error);
    return res.status(500).json({ error: 'Failed to update incident status' });
  }
}

export async function getAdminPrices(req: AuthenticatedRequest, res: Response) {
  try {
    const { cityId } = req.query;

    const where: any = {};
    if (cityId && typeof cityId === 'string' && cityId !== 'ALL') {
      where.cityId = cityId;
    }

    const [prices, rules, reports] = await Promise.all([
      prisma.priceRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { city: true },
      }),
      prisma.cityFareRule.findMany({
        where,
        orderBy: { cityId: 'asc' },
        include: { city: true, transportMode: true },
      }),
      prisma.fareReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { city: true, transportMode: true },
      }),
    ]);

    return res.json({ prices, rules, reports });
  } catch (error) {
    console.error('getAdminPrices error:', error);
    return res.status(500).json({ error: 'Failed to retrieve prices' });
  }
}

export async function createCityPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      cityId,
      transportModeId,
      baseFare,
      baseDistanceKm,
      perKmRate,
      waitingChargePerHour,
      nightSurchargePct,
      hillTerrainSurchargePct,
      sourceType,
      officialCircularRef,
      notes,
    } = req.body;
    const adminId = req.user?.id;

    if (!cityId || !transportModeId || baseFare === undefined || perKmRate === undefined) {
      return res.status(400).json({ error: 'City, Mode, Base Fare and Per-KM rate are required' });
    }

    const rule = await prisma.cityFareRule.create({
      data: {
        cityId,
        transportModeId,
        baseFare: parseFloat(baseFare),
        baseDistanceKm: parseFloat(baseDistanceKm || 1.5),
        perKmRate: parseFloat(perKmRate),
        waitingChargePerHour: parseFloat(waitingChargePerHour || 0),
        nightSurchargePct: parseFloat(nightSurchargePct || 25),
        hillTerrainSurchargePct: parseFloat(hillTerrainSurchargePct || 0),
        sourceType: sourceType || 'OFFICIAL_GOVT',
        officialCircularRef: officialCircularRef || 'RTO Notification',
        notes: notes || null,
      },
      include: { city: true, transportMode: true },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        'CREATE_FARE_RULE',
        'FARE_RULE',
        rule.id,
        `Created ${transportModeId} fare rule for city ${rule.city.name}`
      );
    }

    return res.status(201).json({ message: 'Fare rule created', rule });
  } catch (error) {
    console.error('createCityPrice error:', error);
    return res.status(500).json({ error: 'Failed to create fare rule' });
  }
}

export async function updateCityPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;
    const adminId = req.user?.id;

    const updated = await prisma.cityFareRule.update({
      where: { id },
      data: {
        ...(data.baseFare !== undefined && { baseFare: parseFloat(data.baseFare) }),
        ...(data.baseDistanceKm !== undefined && { baseDistanceKm: parseFloat(data.baseDistanceKm) }),
        ...(data.perKmRate !== undefined && { perKmRate: parseFloat(data.perKmRate) }),
        ...(data.nightSurchargePct !== undefined && { nightSurchargePct: parseFloat(data.nightSurchargePct) }),
        ...(data.hillTerrainSurchargePct !== undefined && { hillTerrainSurchargePct: parseFloat(data.hillTerrainSurchargePct) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { city: true, transportMode: true },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        'UPDATE_FARE_RULE',
        'FARE_RULE',
        id,
        `Updated fare rule for ${updated.city.name} - ${updated.transportMode.displayName}`
      );
    }

    return res.json({ message: 'Fare rule updated', rule: updated });
  } catch (error) {
    console.error('updateCityPrice error:', error);
    return res.status(500).json({ error: 'Failed to update fare rule' });
  }
}

export async function deleteCityPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    await prisma.cityFareRule.delete({ where: { id } });

    if (adminId) {
      await recordAuditLog(adminId, 'DELETE_FARE_RULE', 'FARE_RULE', id, 'Deleted fare rule record');
    }

    return res.json({ message: 'Fare rule deleted' });
  } catch (error) {
    console.error('deleteCityPrice error:', error);
    return res.status(500).json({ error: 'Failed to delete fare rule' });
  }
}

export async function getAdminDestinations(req: AuthenticatedRequest, res: Response) {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            services: true,
            incidents: true,
            safetyZones: true,
            fareRules: true,
          },
        },
      },
    });

    return res.json({ cities, destinations: cities });
  } catch (error) {
    console.error('getAdminDestinations error:', error);
    return res.status(500).json({ error: 'Failed to retrieve destinations' });
  }
}

export async function updateDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { defaultSafetyScore, description } = req.body;
    const adminId = req.user?.id;

    const updated = await prisma.city.update({
      where: { id },
      data: {
        ...(defaultSafetyScore !== undefined && { defaultSafetyScore: parseInt(defaultSafetyScore, 10) }),
        ...(description !== undefined && { description }),
      },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        'UPDATE_DESTINATION',
        'CITY',
        id,
        `Updated safety score/description for city ${updated.name}`
      );
    }

    return res.json({ message: 'Destination updated', city: updated });
  } catch (error) {
    console.error('updateDestination error:', error);
    return res.status(500).json({ error: 'Failed to update destination' });
  }
}

export async function getAdminCommunityPosts(req: AuthenticatedRequest, res: Response) {
  try {
    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return res.json({ posts });
  } catch (error) {
    console.error('getAdminCommunityPosts error:', error);
    return res.status(500).json({ error: 'Failed to retrieve community posts' });
  }
}

export async function deleteCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    await prisma.communityPost.delete({ where: { id } });

    if (adminId) {
      await recordAuditLog(adminId, 'DELETE_COMMUNITY_POST', 'COMMUNITY_POST', id, 'Deleted post due to moderation violation');
    }

    return res.json({ message: 'Community post removed' });
  } catch (error) {
    console.error('deleteCommunityPost error:', error);
    return res.status(500).json({ error: 'Failed to delete community post' });
  }
}

export async function getAdminAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const [rawCities, incidentsByCategory, usersByRole, postsByCategory] = await Promise.all([
      prisma.city.findMany({
        select: {
          id: true,
          name: true,
          defaultSafetyScore: true,
          _count: {
            select: { incidents: true, services: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.incidentReport.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.communityPost.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
    ]);

    const incidentsByCity = rawCities
      .map((c) => ({
        cityId: c.id,
        name: c.name,
        defaultSafetyScore: c.defaultSafetyScore,
        city: { name: c.name },
        _count: {
          id: c._count.incidents,
          incidents: c._count.incidents,
          services: c._count.services,
        },
      }))
      .sort((a, b) => b._count.id - a._count.id);

    return res.json({
      incidentsByCity,
      incidentsByCategory,
      usersByRole,
      postsByCategory,
    });
  } catch (error) {
    console.error('getAdminAnalytics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
}

export async function getAdminAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        admin: {
          select: { name: true, email: true, role: true },
        },
      },
    });

    return res.json({ logs });
  } catch (error) {
    console.error('getAdminAuditLogs error:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
}

export async function reviewFareReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const adminId = req.user?.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const report = await prisma.fareReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Fare report not found' });
    }

    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
    const newWeight = action === 'APPROVE' ? 95 : 20;

    const updated = await prisma.fareReport.update({
      where: { id },
      data: {
        verificationStatus: newStatus,
        reliabilityWeight: newWeight,
      },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        action === 'APPROVE' ? 'VERIFY_FARE' : 'REJECT_FARE',
        'FARE_REPORT',
        id,
        `Fare report ${id} marked as ${newStatus}`
      );
    }

    return res.json({
      message: `Fare report marked as ${newStatus}`,
      fareReport: updated,
    });
  } catch (error) {
    console.error('Review fare report error:', error);
    return res.status(500).json({ error: 'Failed to update fare report status' });
  }
}

export async function getAdminModerators(req: AuthenticatedRequest, res: Response) {
  try {
    const moderators = await prisma.user.findMany({
      where: { role: 'MODERATOR' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        location: true,
        createdAt: true,
        _count: {
          select: {
            moderationActions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ moderators });
  } catch (error: any) {
    console.error('getAdminModerators error:', error);
    return res.status(500).json({ error: 'Failed to retrieve moderators' });
  }
}

export async function promoteUserToModerator(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot alter role of another Administrator' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: 'MODERATOR' },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        'PROMOTE_MODERATOR',
        'USER',
        id,
        `Promoted user ${targetUser.email} (${targetUser.name}) to MODERATOR`
      );
    }

    // Send in-app notification
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Promoted to Safety Moderator',
        message: 'You have been granted Safety Moderator privileges on YatraGuard. You now have access to the Moderator Portal at /moderator/dashboard.',
        type: 'INFO',
        linkUrl: '/moderator/dashboard',
      },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `User ${targetUser.name} has been promoted to Moderator`,
      user: updated,
    });
  } catch (error: any) {
    console.error('promoteUserToModerator error:', error);
    return res.status(500).json({ error: error.message || 'Promotion failed' });
  }
}

export async function revokeModerator(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot revoke an Administrator' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: 'TRAVELER' },
    });

    if (adminId) {
      await recordAuditLog(
        adminId,
        'REVOKE_MODERATOR',
        'USER',
        id,
        `Revoked MODERATOR role from ${targetUser.email}. User reverted to TRAVELER.`
      );
    }

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Moderator Role Revoked',
        message: 'Your YatraGuard Moderator role has been revoked by an administrator. You can continue using your standard Traveler account.',
        type: 'INFO',
      },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Moderator privileges revoked for ${targetUser.name}`,
      user: updated,
    });
  } catch (error: any) {
    console.error('revokeModerator error:', error);
    return res.status(500).json({ error: error.message || 'Revocation failed' });
  }
}

export async function getAdminImages(req: AuthenticatedRequest, res: Response) {
  try {
    const [profileImages, postImages] = await Promise.all([
      prisma.profileImage.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.postMedia.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          post: {
            select: { id: true, title: true, destinationName: true },
          },
        },
      }),
    ]);

    return res.json({
      profileImages,
      postImages,
    });
  } catch (error: any) {
    console.error('getAdminImages error:', error);
    return res.status(500).json({ error: 'Failed to retrieve image repository' });
  }
}

