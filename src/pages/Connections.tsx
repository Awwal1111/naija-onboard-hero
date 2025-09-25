import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck } from 'lucide-react'
import ConnectionRequests from './ConnectionRequests'
import Connected from './Connected'
import { useConnections } from '@/hooks/useConnections'
import ResponsiveLayout from '@/components/ResponsiveLayout'

export const Connections = () => {
  const { connectionRequests, connections } = useConnections()
  
  const pendingRequestsCount = connectionRequests.filter(req => req.status === 'pending').length
  const connectedCount = connections.length

  return (
    <ResponsiveLayout>
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="connected" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connected" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Connected
              {connectedCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {connectedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Requests
              {pendingRequestsCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="connected" className="mt-6">
            <Connected />
          </TabsContent>
          <TabsContent value="requests" className="mt-6">
            <ConnectionRequests />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  )
}

export default Connections