import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react';

export function OnboardingDashboardPage() {
  const [activeTab, setActiveTab] = useState('in-progress');

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Dashboard</h1>
          <p className="text-muted-foreground">Manage employee onboarding process</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Onboarding
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">5</span>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">23</span>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delayed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">2</span>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="in-progress">In Progress (5)</TabsTrigger>
          <TabsTrigger value="completed">Completed (23)</TabsTrigger>
          <TabsTrigger value="delayed">Delayed (2)</TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Onboarding Instances</CardTitle>
              <CardDescription>
                Employees currently in onboarding process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Onboarding instances would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Onboarding</CardTitle>
              <CardDescription>
                Successfully completed onboarding process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Completed instances would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delayed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Delayed Onboarding</CardTitle>
              <CardDescription>
                Onboarding processes that exceeded target completion date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Delayed instances would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


