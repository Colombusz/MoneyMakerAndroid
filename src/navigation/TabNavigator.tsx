import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { RecurringScreen } from '../screens/RecurringScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { PartnerScreen } from '../screens/PartnerScreen';
import { VacationScreen } from '../screens/VacationScreen';

const Tab = createBottomTabNavigator();

// Thumb-friendly content height of the tab bar. The device's bottom safe-area
// inset (Android 3-button navigation bar / gesture pill, iOS home indicator) is
// added on top so the bar is never drawn underneath the system controls.
const TAB_BAR_CONTENT_HEIGHT = 64;

export const TabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />

        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          }}
        />

        <Tab.Screen
          name="Recurring"
          component={RecurringScreen}
          options={{
            tabBarLabel: 'Bills',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="repeat" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />

        <Tab.Screen
          name="Goals"
          component={GoalsScreen}
          options={{
            tabBarLabel: 'Goals',
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
          }}
        />

        <Tab.Screen
          name="Partner"
          component={PartnerScreen}
          options={{
            tabBarLabel: 'Partner',
            tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
          }}
        />

        <Tab.Screen
          name="Vacation"
          component={VacationScreen}
          options={{
            tabBarLabel: 'Vacation',
            tabBarIcon: ({ color, size }) => <Ionicons name="airplane" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
  );
};
