import React from 'react';
import { NearbyPlacesPage } from './NearbyPlacesPage';

interface ServicesPageProps {
  openEmergencyModal?: () => void;
}

/**
 * ServicesPage
 * Renders the unified Nearby Places, Local Travel & Medical Assistance module
 * to preserve all existing /services route and component imports cleanly.
 */
export const ServicesPage: React.FC<ServicesPageProps> = ({ openEmergencyModal }) => {
  return <NearbyPlacesPage openEmergencyModal={openEmergencyModal} />;
};

export default ServicesPage;
