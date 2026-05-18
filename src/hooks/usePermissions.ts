/**
 * Hook for managing app permissions
 */

import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

export interface PermissionStatus {
  [key: string]: boolean;
}

const REQUIRED_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.INTERNET,
  PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
];

// Android 11+ requires MANAGE_EXTERNAL_STORAGE for unrestricted access
if (Platform.Version >= 30) {
  const MANAGE_STORAGE = "android.permission.MANAGE_EXTERNAL_STORAGE";
  if (!REQUIRED_PERMISSIONS.includes(MANAGE_STORAGE)) {
    REQUIRED_PERMISSIONS.push(MANAGE_STORAGE);
  }
}

// Foreground service permission
const FOREGROUND_SERVICE = "android.permission.FOREGROUND_SERVICE";
if (!REQUIRED_PERMISSIONS.includes(FOREGROUND_SERVICE)) {
  REQUIRED_PERMISSIONS.push(FOREGROUND_SERVICE);
}

export function usePermissions(): {
  hasAllPermissions: boolean;
  permissionStatus: PermissionStatus;
  requestPermissions: () => Promise<boolean>;
  isLoading: boolean;
} {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({});
  const [isLoading, setIsLoading] = useState(true);

  const hasAllPermissions = REQUIRED_PERMISSIONS.every(
    (perm) => permissionStatus[perm] !== false
  );

  const checkPermissions = async () => {
    try {
      setIsLoading(true);
      const status: PermissionStatus = {};

      if (Platform.OS === "android") {
        for (const permission of REQUIRED_PERMISSIONS) {
          try {
            const result = await PermissionsAndroid.check(permission);
            status[permission] = result;
          } catch (error) {
            console.warn(`Error checking permission ${permission}:`, error);
            status[permission] = false;
          }
        }
      } else {
        // iOS or other platforms - all granted by default
        REQUIRED_PERMISSIONS.forEach((perm) => {
          status[perm] = true;
        });
      }

      setPermissionStatus(status);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS !== "android") {
        return true; // Non-Android platforms auto-grant
      }

      const permissionsToRequest = REQUIRED_PERMISSIONS.filter(
        (perm) => !permissionStatus[perm]
      );

      if (permissionsToRequest.length === 0) {
        return true; // All permissions already granted
      }

      const granted = await PermissionsAndroid.requestMultiple(
        permissionsToRequest
      );

      const allGranted = Object.values(granted).every(
        (status) =>
          status === PermissionsAndroid.RESULTS.GRANTED ||
          status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      );

      // Update status
      const newStatus = { ...permissionStatus };
      Object.entries(granted).forEach(([perm, status]) => {
        newStatus[perm] =
          status === PermissionsAndroid.RESULTS.GRANTED ||
          status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      });
      setPermissionStatus(newStatus);

      return allGranted;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    hasAllPermissions,
    permissionStatus,
    requestPermissions,
    isLoading,
  };
}
