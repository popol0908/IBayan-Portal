/**
 * Geolocation helpers for resident registration and map pinning.
 */

const LOCATION_DENIED_MESSAGE =
  'You must enable location access to continue registration. Please enable it in your browser or device settings.';

export { LOCATION_DENIED_MESSAGE };

/**
 * Take a single GPS reading from the device.
 * @returns {Promise<{ lat: number, lng: number, accuracy: number }>}
 */
function singleReading() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Request the device's current GPS coordinates.
 * Takes multiple readings and picks the most accurate one
 * to improve pin consistency across registrations.
 * @param {number} [samples=3] — number of readings to take
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export async function getCurrentPosition(samples = 3) {
  if (!navigator.geolocation) {
    throw {
      code: 0,
      message: 'Geolocation is not supported by your browser.',
    };
  }

  const readings = [];

  for (let i = 0; i < samples; i++) {
    try {
      const reading = await singleReading();
      readings.push(reading);
    } catch (err) {
      // If even the first reading fails, propagate the error immediately
      if (readings.length === 0) throw err;
      // Otherwise use whatever readings we already have
      break;
    }
  }

  // Pick the reading with the best (lowest) accuracy value
  readings.sort((a, b) => a.accuracy - b.accuracy);
  const best = readings[0];

  return { lat: best.lat, lng: best.lng };
}

export function isPermissionDeniedError(err) {
  return err && (err.code === 1 || err.code === err.PERMISSION_DENIED);
}
