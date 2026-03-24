import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TABS = [
  { route: '/(tabs)',               segment: '/',              icon: 'home-variant'    },
  { route: '/(tabs)/cultures',      segment: '/cultures',      icon: 'sprout'          },
  { route: '/(tabs)/calendar',      segment: '/calendar',      icon: 'calendar-month'  },
  { route: '/(tabs)/irrigation',    segment: '/irrigation',    icon: 'water'           },
  { route: '/(tabs)/fertilisation', segment: '/fertilisation', icon: 'leaf'            },
];

export default function BottomBar() {
  const pathname = usePathname();

  const isActive = (tab) => {
    if (tab.segment === '/') {
      return pathname === '/' || pathname === '';
    }
    return pathname === tab.segment || pathname.startsWith(tab.segment);
  };

  return (
    <View style={styles.bottomBar}>
      {TABS.map((tab) => {
        const active = isActive(tab);
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.item}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={27}
              color={active ? '#4CAF50' : '#7A7A7A'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: Platform.OS === 'web' ? 64 : 70,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
});