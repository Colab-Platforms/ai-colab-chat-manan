"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, CreditCard, Bot, Building, BarChart3, Loader2, Trash2, Search } from "lucide-react";
import { userService, planService, modelService, modelProviderService, usageLogService } from "@/lib/services";

export function AdminPanel() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("SUPERADMIN");

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
        <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="w-3 h-3" /> Users</TabsTrigger>
        <TabsTrigger value="plans" className="gap-1.5 text-xs"><CreditCard className="w-3 h-3" /> Plans</TabsTrigger>
        <TabsTrigger value="models" className="gap-1.5 text-xs"><Bot className="w-3 h-3" /> Models</TabsTrigger>
        <TabsTrigger value="providers" className="gap-1.5 text-xs"><Building className="w-3 h-3" /> Providers</TabsTrigger>
      </TabsList>

      <TabsContent value="users"><UsersTable /></TabsContent>
      <TabsContent value="plans"><PlansTable /></TabsContent>
      <TabsContent value="models"><ModelsTable /></TabsContent>
      <TabsContent value="providers"><ProvidersTable /></TabsContent>
    </Tabs>
  );
}

function UsersTable() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    try {
      const res = await userService.list({ search });
      setUsers(res.data.data?.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    try { await userService.delete(id); fetch(); } catch { /* ignore */ }
  };

  if (loading) return <Loader />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Users</CardTitle>
        <div className="relative w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  {u.userRoles?.map((ur: any) => (
                    <Badge key={ur.role.id} variant="secondary" className="mr-1 text-xs">{ur.role.name}</Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(u.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlansTable() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await planService.list();
      setPlans(res.data.data?.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    try { await planService.delete(id); fetch(); } catch { /* ignore */ }
  };

  if (loading) return <Loader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Token Limit</TableHead>
              <TableHead>Models</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.monthlyPrice === 0 ? "Free" : `$${p.monthlyPrice}`}</TableCell>
                <TableCell>{(p.tokenLimit / 1000).toFixed(0)}k</TableCell>
                <TableCell>{p.features?.maxModels === -1 ? "∞" : p.features?.maxModels}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ModelsTable() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await modelService.list();
      setModels(res.data.data?.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleToggleActive = async (model: any) => {
    try {
      await modelService.update(model.id, { isActive: !model.isActive });
      fetch();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    try { await modelService.delete(id); fetch(); } catch { /* ignore */ }
  };

  if (loading) return <Loader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Models</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead>Cost (in/out)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{m.externalId}</TableCell>
                <TableCell className="text-xs">${m.inputCostPer1k} / ${m.outputCostPer1k}</TableCell>
                <TableCell>
                  <Badge variant={m.isActive ? "default" : "secondary"}>
                    {m.isActive ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(m)}>
                    {m.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProvidersTable() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await modelProviderService.list();
      setProviders(res.data.data?.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    try { await modelProviderService.delete(id); fetch(); } catch { /* ignore */ }
  };

  if (loading) return <Loader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Model Providers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.description}</TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? "default" : "secondary"}>
                    {p.isActive ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Loader() {
  return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
}
