import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

interface TabItem {
  name: string;
  activeIcon: string;
  inactiveIcon: string;
  path: string;
}

const tabs: TabItem[] = [
  {
    name: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
    path: '/tabs/home'
  },
  {
    name: 'Vendors',
    activeIcon: 'cube',
    inactiveIcon: 'cube-outline',
    path: '/tabs/vendors'
  },
  {
    name: 'Payments',
    activeIcon: 'cash',
    inactiveIcon: 'cash-outline',
    path: '/tabs/vendorPayments'
  },
  {
    name: 'Customers',
    activeIcon: 'people',
    inactiveIcon: 'people-outline',
    path: '/tabs/customers'
  },
  {
    name: 'Settings',
    activeIcon: 'settings',
    inactiveIcon: 'settings-outline',
    path: '/tabs/settings'
  }
];

export default function CustomTabBar() {
  const router = useRouter();
  const currentPath = usePathname();
  
  // No animations - just direct rendering for maximum performance
  const handleTabPress = (path: string) => {
    // Only navigate if we're not already on this path
    if (currentPath !== path) {
      // Use type assertion to tell TypeScript this is a valid route
      router.push(path as any);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentPath === tab.path;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.path)}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons
                name={isActive ? tab.activeIcon as any : tab.inactiveIcon as any}
                size={24}
                color={isActive ? '#d88c9a' : '#9ca3af'}
              />
            </View>
            
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? '#d88c9a' : '#9ca3af',
                  fontWeight: isActive ? '500' : '400',
                }
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  tabText: {
    fontSize: 12,
    marginTop: 2
  }
});
