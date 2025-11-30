import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, Users, DollarSign, Briefcase } from 'lucide-react'

interface AdminAnalyticsChartsProps {
  userGrowthData: any[]
  revenueData: any[]
  activityBreakdown: any[]
  platformHealth: any
}

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  userGrowthData,
  revenueData,
  activityBreakdown,
  platformHealth
}) => {
  return (
    <div className="space-y-6">
      {/* Platform Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">{platformHealth.activeUsers}</div>
                <div className="text-xs text-text-secondary">Active Users</div>
              </div>
              <Users className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">₦{platformHealth.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-text-secondary">Revenue</div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{platformHealth.totalJobs}</div>
                <div className="text-xs text-text-secondary">Total Jobs</div>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600/30" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{platformHealth.totalExperts}</div>
                <div className="text-xs text-text-secondary">Experts</div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* User Growth Trend */}
      {userGrowthData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Growth (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="signups" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} name="New Signups" />
                <Area type="monotone" dataKey="active" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="Active Users" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      
      {/* Revenue Trend */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#00C49F" strokeWidth={2} name="Daily Revenue (NC)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      
      {/* Activity Breakdown */}
      {activityBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Activity Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {activityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-3">
                {activityBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
