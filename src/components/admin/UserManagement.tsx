import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, UserPlus, ShieldCheck, Pencil, Eye, EyeOff } from "lucide-react";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  banned: boolean;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit dialog
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Created user display
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list" },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create", email: newEmail.trim(), password: newPassword, fullName: newName.trim() },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setCreatedCreds({ email: newEmail.trim(), password: newPassword });
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      fetchUsers();
      toast({ title: "Usuario creado", description: "El acceso está activo inmediatamente." });
    }
    setCreating(false);
  };

  const toggleAccess = async (userId: string) => {
    setTogglingId(userId);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "toggle-access", userId },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      fetchUsers();
      toast({ title: data.banned ? "Acceso desactivado" : "Acceso activado" });
    }
    setTogglingId(null);
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Eliminar permanentemente a ${email}?`)) return;
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete", userId },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      fetchUsers();
      toast({ title: "Usuario eliminado" });
    }
  };

  const openEdit = (u: ManagedUser) => {
    setEditUser(u);
    setEditName(u.full_name);
    setEditEmail(u.email);
    setEditPassword("");
    setShowEditPassword(false);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "update-credentials",
        userId: editUser.id,
        email: editEmail.trim() !== editUser.email ? editEmail.trim() : undefined,
        password: editPassword || undefined,
        fullName: editName.trim(),
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setEditUser(null);
      fetchUsers();
      toast({ title: "Credenciales actualizadas" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Create new user */}
      <div className="glass p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Crear nuevo acceso
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Nombre completo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-secondary/50 border-border"
          />
          <Input
            placeholder="Correo electrónico"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="bg-secondary/50 border-border"
          />
          <div className="relative">
            <Input
              placeholder="Contraseña"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-secondary/50 border-border pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button onClick={createUser} disabled={creating} className="gradient-primary">
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          Crear Acceso
        </Button>
      </div>

      {/* Show created credentials */}
      {createdCreds && (
        <div className="glass p-4 border border-primary/30 space-y-2">
          <h4 className="text-sm font-semibold text-primary">✅ Credenciales creadas</h4>
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Correo:</span> <span className="font-mono">{createdCreds.email}</span></p>
            <p><span className="text-muted-foreground">Contraseña:</span> <span className="font-mono">{createdCreds.password}</span></p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreatedCreds(null)}>Cerrar</Button>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No hay usuarios.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="glass p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{u.full_name || u.email}</p>
                  {u.role === "admin" && (
                    <Badge className="bg-primary/20 text-primary gap-1">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </Badge>
                  )}
                  {u.banned && (
                    <Badge variant="outline" className="text-destructive border-destructive/30">Desactivado</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              {u.role !== "admin" && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{u.banned ? "Off" : "On"}</span>
                    <Switch
                      checked={!u.banned}
                      disabled={togglingId === u.id}
                      onCheckedChange={() => toggleAccess(u.id)}
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteUser(u.id, u.email)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar credenciales</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nueva contraseña (dejar vacío para no cambiar)</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving} className="gradient-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
