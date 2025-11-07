import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck } from 'lucide-react'
import ConnectionRequests from './ConnectionRequests'
import Connected from './Connected'
import { useConnections } from '@/hooks/useConnections'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { supabase } from '@/integrations/supabase/client'

export const Connections = () => {
  const { connectionRequests, connections, refetch } = useConnections()
  
  React.useEffect(() => {
    refetch()
    
    // Set up real-time subscriptions
    const channel = supabase
      .channel('connections_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        refetch()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => {
        refetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  const pendingRequestsCount = connectionRequests.filter(req => req.status === 'pending').length
  const connectedCount = connections.length

  return (
    <ResponsiveLayout>
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-6xl">
        <Tabs defaultValue="connected" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 md:h-10">
            <TabsTrigger value="connected" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden xs:inline">Connected</span>
              <span className="xs:hidden">Connect</span>
              {connectedCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 md:ml-1 text-xs h-5">
                  {connectedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
              <UserCheck className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden xs:inline">Requests</span>
              <span className="xs:hidden">Req</span>
              {pendingRequestsCount > 0 && (
                <Badge variant="destructive" className="ml-0.5 md:ml-1 text-xs h-5">
                  {pendingRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="connected" className="mt-4 md:mt-6">
            <Connected />
          </TabsContent>
          <TabsContent value="requests" className="mt-4 md:mt-6">
            <ConnectionRequests />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  )
}

export default Connections