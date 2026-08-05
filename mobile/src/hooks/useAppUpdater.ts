import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SpInAppUpdates, { IAUUpdateKind, StartUpdateOptions } from 'sp-react-native-in-app-updates';
import { compareVersions } from 'compare-versions';
import { fetchVersionConfig } from '../lib/api';

const DISMISSED_UPDATE_VERSION_KEY = '@app_update_dismissed_version';
const DISMISSED_UPDATE_FIRST_TIMESTAMP_KEY = '@app_update_first_timestamp';
const DISMISSED_UPDATE_PROMPT_COUNT_KEY = '@app_update_prompt_count';
const DEFAULT_PROMPT_SCHEDULE_DAYS = [0, 7, 14, 30]; // Fallback if backend doesn't provide schedule

export function useAppUpdater() {
  const [forceUpdateRequired, setForceUpdateRequired] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = async () => {
    try {
      setIsChecking(true);
      const currentVersion = Constants.expoConfig?.version || '1.0.0';

      // 1. Check backend for forced update — also fetch the prompt schedule
      const { config, error } = await fetchVersionConfig();
      
      // Hoist schedDays so the inAppUpdates callback below can access it
      let schedDays: number[] = DEFAULT_PROMPT_SCHEDULE_DAYS;

      if (!error && config) {
        const { minimumVersion, updatePromptScheduleDays } = config as any;
        if (Array.isArray(updatePromptScheduleDays) && updatePromptScheduleDays.length > 0) {
          schedDays = updatePromptScheduleDays;
        }
        
        if (compareVersions(currentVersion, minimumVersion) < 0) {
          // Current version is lower than minimum allowed version
          setForceUpdateRequired(true);
          setIsChecking(false);
          return; // Block here, don't check for optional updates
        }
      }

      // 2. Check Play Store/App Store for optional update
      const inAppUpdates = new SpInAppUpdates(
        false // isDebug
      );

      inAppUpdates.checkNeedsUpdate().then(async (result) => {
        if (result.shouldUpdate) {
          const storeVersion = result.storeVersion;
          if (!storeVersion) return;

          // Check if we should remind the user based on the 0, 7, 14, 30 schedule
          const lastDismissedVersion = await AsyncStorage.getItem(DISMISSED_UPDATE_VERSION_KEY);

          if (lastDismissedVersion === storeVersion) {
            const firstTimestampStr = await AsyncStorage.getItem(DISMISSED_UPDATE_FIRST_TIMESTAMP_KEY);
            const promptCountStr = await AsyncStorage.getItem(DISMISSED_UPDATE_PROMPT_COUNT_KEY);

            if (firstTimestampStr && promptCountStr) {
              const firstDate = new Date(parseInt(firstTimestampStr, 10));
              const promptCount = parseInt(promptCountStr, 10);
              
              // If they have exhausted the schedule, stop nagging them
              if (promptCount >= schedDays.length) {
                return;
              }

              const nextPromptDays = schedDays[promptCount];
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - firstDate.getTime());
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays < nextPromptDays) {
                // Not enough days have passed since the first prompt
                return;
              }
            }
          }

          let updateOptions: StartUpdateOptions = {};
          if (Platform.OS === 'android') {
            updateOptions = { updateType: IAUUpdateKind.FLEXIBLE };
          }

          inAppUpdates.startUpdate(updateOptions)
            .then(async () => {
              // Update started
            })
            .catch(async (e) => {
              // User dismissed or cancelled
              console.log('Update cancelled or failed', e);
              
              const currentVersion = await AsyncStorage.getItem(DISMISSED_UPDATE_VERSION_KEY);
              let promptCount = 1;
              let firstTimestamp = Date.now().toString();

              if (currentVersion === storeVersion) {
                const existingCountStr = await AsyncStorage.getItem(DISMISSED_UPDATE_PROMPT_COUNT_KEY);
                promptCount = existingCountStr ? parseInt(existingCountStr, 10) + 1 : 1;
                
                const existingTimestamp = await AsyncStorage.getItem(DISMISSED_UPDATE_FIRST_TIMESTAMP_KEY);
                if (existingTimestamp) {
                  firstTimestamp = existingTimestamp;
                }
              }

              await AsyncStorage.setItem(DISMISSED_UPDATE_VERSION_KEY, storeVersion);
              await AsyncStorage.setItem(DISMISSED_UPDATE_FIRST_TIMESTAMP_KEY, firstTimestamp);
              await AsyncStorage.setItem(DISMISSED_UPDATE_PROMPT_COUNT_KEY, promptCount.toString());
            });
        }
      }).catch(e => {
        console.warn('In-app update check failed (normal in dev/Expo Go)', e);
      });

    } catch (e) {
      console.warn('App updater error:', e);
    } finally {
      setIsChecking(false);
    }
  };

  return { forceUpdateRequired, isChecking };
}
