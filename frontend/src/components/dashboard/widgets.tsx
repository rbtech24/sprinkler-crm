'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'

export function PartsToOrder() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Parts to Order</h3>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500 text-sm">Coming soon...</p>
      </CardContent>
    </Card>
  )
}

export function TodaysStopsMap() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Today&apos;s Stops</h3>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
          <p className="text-gray-500 text-sm">Map integration coming soon...</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationsWidget() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Notifications</h3>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500 text-sm">No new notifications</p>
      </CardContent>
    </Card>
  )
}

export function TasksWidget() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Tasks & Reminders</h3>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500 text-sm">No tasks due today</p>
      </CardContent>
    </Card>
  )
}

export function WeatherWidget() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Weather</h3>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500 text-sm">Weather data coming soon...</p>
      </CardContent>
    </Card>
  )
}
