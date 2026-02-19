import { createUrl } from '../util';

export interface Asset {
  type: 'asset';
  attributes: {
    URL: string;
  };
}

interface Participant {
  type: 'participant';
}

interface Roster {
  type: 'roster';
}

interface Match {
  included: (Asset | Participant | Roster)[];
}

interface Log {
  _T: string;
}

export interface Location {
  x: number;
  y: number;
}

export interface LogVehicle extends Log {
  _T: 'LogVehicleLeave' | 'LogVehicleRide';
  vehicle: {
    vehicleId: string;
    location: Location;
  };
}

type Telemetry = Log | LogVehicle;

export const getMatch = async (matchId: string): Promise<Match> => {
  const url = createUrl(`https://api.pubg.com/shards/steam/matches/${matchId}`);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.api+json',
    },
  });

  return response.json();
};

export const getTelemetry = async (url: string): Promise<Telemetry[]> => {
  const response = await fetch(url);

  return response.json();
};
