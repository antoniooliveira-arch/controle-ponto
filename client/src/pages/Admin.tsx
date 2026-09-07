import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { businessDateNow, formatDate, formatDuration, formatTime, recordTime } from "@/lib/attendance";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, Check, CircleAlert, Clock3, Eye, EyeOff, FileBarChart, Loader2, LockKeyhole, LogOut, Plus, RefreshCw, Settings2, ShieldCheck, UserCog, Users, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Tab = "overview" | "people" | "reports";
type EmployeeItem = { id: number; fullName: string; registration: string; sectorId: number | null; sectorName: string | null; active: boolean };

const statusStyle = {
  SEM_ENTRADA: { label: "Sem entrada", className: "text-stone-500 bg-stone-200" },
  TRABALHANDO: { label: "Em atividade", className: "text-emerald-800 bg-emerald-100" },
  EM_INTERVALO: { label: "Em intervalo", className: "text-amber-800 bg-amber-100" },
  COMPLETA: { label: "Completa", className: "text-sky-800 bg-sky-100" },
};

function AdminHeader({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const items: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Pontos de hoje", icon: BarChart3 },
    { id: "people", label: "Servidores", icon: Users },
    { id: "reports", label: "Relatórios", icon: FileBarChart },
  ];
  return <header className="admin-header"><div className="flex min-w-0 items-center gap-4"><button onClick={() => setLocation("/")} className="grid h-9 w-9 shrink-0 place-items-center border border-stone-900/30 text-stone-900 transition-colors hover:bg-stone-900 hover:text-white" aria-label="Voltar ao ponto"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0"><p className="tiny-label">Administração</p><h1 className="truncate font-serif text-2xl font-semibold">Controle de ponto</h1></div></div><nav className="order-3 flex w-full gap-1 border-t border-stone-900/10 pt-3 lg:order-none lg:w-auto lg:border-0 lg:pt-0">{items.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`admin-nav-item ${tab === item.id ? "admin-nav-item-active" : ""}`}><item.icon className="h-3.5 w-3.5" /><span>{item.label}</span></button>)}</nav><div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium">{user?.name ?? "Administrador"}</p><p className="tiny-label mt-1">Acesso administrativo</p></div><Button variant="ghost" size="icon" onClick={() => setPasswordOpen(true)} title="Redefinir minha senha"><LockKeyhole className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={logout} title="Sair da administração"><LogOut className="h-4 w-4" /></Button></div><ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} /></header>;
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();
  const change = trpc.admin.changeOwnPassword.useMutation({
    onSuccess: async () => {
      toast.success("Senha redefinida. Use a nova senha no próximo acesso.");
      await utils.auth.me.invalidate();
      setPassword("");
      setConfirm("");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("A confirmação não corresponde à nova senha.");
      return;
    }
    change.mutate({ password });
  };

  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}><DialogContent className="rounded-none bg-[#f8f3e9] sm:max-w-md"><DialogHeader><p className="tiny-label">Segurança de acesso</p><DialogTitle className="font-serif text-3xl">Redefinir minha senha</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><p className="text-sm leading-relaxed text-stone-600">Defina uma nova senha para sua conta administrativa. As sessões ativas serão encerradas — você precisará entrar novamente.</p><div className="space-y-2"><Label className="tiny-label">Nova senha</Label><Input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} required className="admin-input" /></div><div className="space-y-2"><Label className="tiny-label">Confirmar nova senha</Label><Input value={confirm} onChange={event => setConfirm(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} required className="admin-input" /></div><Button type="button" variant="link" onClick={() => setShowPassword(value => !value)} className="h-auto p-0 text-xs font-semibold text-[#2e7d4e] underline-offset-4 hover:text-[#1d4a2f]">{showPassword ? "Ocultar senha" : "Mostrar senha"}</Button><Button type="submit" disabled={change.isPending} className="h-11 w-full rounded-none bg-stone-950 text-xs tracking-[0.15em]">{change.isPending ? <Loader2 className="animate-spin" /> : "Confirmar redefinição"}</Button></form></DialogContent></Dialog>;
}

function Overview() {
  const [today] = useState(businessDateNow);
  const dashboard = trpc.admin.dashboard.useQuery({ businessDate: today }, { refetchInterval: 15_000 });
  const rows = dashboard.data?.rows ?? [];
  const totals = rows.reduce((current, row) => ({
    complete: current.complete + (row.summary.status === "COMPLETA" ? 1 : 0),
    working: current.working + (row.summary.status === "TRABALHANDO" ? 1 : 0),
    missing: current.missing + (row.summary.status === "SEM_ENTRADA" ? 1 : 0),
  }), { complete: 0, working: 0, missing: 0 });

  if (dashboard.isError) return <section className="admin-page"><div className="paper-card max-w-xl p-8"><CircleAlert className="h-6 w-6 text-amber-700" /><p className="tiny-label mt-6">Monitoramento indisponível</p><h2 className="mt-3 font-serif text-3xl">Não foi possível carregar os pontos de hoje.</h2><p className="mt-3 text-sm leading-relaxed text-stone-600">A consulta não foi concluída. Nenhuma alteração foi aplicada aos registros existentes.</p><Button onClick={() => dashboard.refetch()} className="mt-6 h-10 rounded-none bg-stone-950 text-xs tracking-[0.14em]">Tentar novamente</Button></div></section>;

  return <section className="admin-page"><div className="admin-title-row"><div><p className="tiny-label">Monitoramento em tempo real</p><h2 className="editorial-title mt-3 text-5xl">Pontos de hoje</h2><p className="mt-3 font-serif text-lg text-stone-600">{formatDate(`${today}T12:00:00`)}</p></div><Button variant="outline" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching} className="rounded-none border-stone-900/25 text-xs tracking-[0.13em]"><RefreshCw className={`mr-2 h-3.5 w-3.5 ${dashboard.isFetching ? "animate-spin" : ""}`} />Atualizar</Button></div><div className="metric-grid mt-9"><div className="metric-card"><span className="tiny-label">Servidores ativos</span><strong>{rows.length}</strong></div><div className="metric-card"><span className="tiny-label">Em atividade</span><strong>{totals.working}</strong></div><div className="metric-card"><span className="tiny-label">Jornadas completas</span><strong>{totals.complete}</strong></div><div className="metric-card"><span className="tiny-label">Sem entrada</span><strong>{totals.missing}</strong></div></div><div className="admin-table-card mt-10 overflow-x-auto"><table><thead><tr><th>Servidor</th><th>Entrada</th><th>Intervalo</th><th>Retorno</th><th>Saída</th><th>Status</th></tr></thead><tbody>{dashboard.isLoading ? <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : rows.length ? rows.map(row => { const style = statusStyle[row.summary.status]; return <tr key={row.employee.id}><td><strong>{row.employee.fullName}</strong><small>{row.employee.sectorName ?? "Sem setor"} · {row.employee.registration}</small></td><td>{formatTime(recordTime(row.records, "ENTRADA"))}</td><td>{formatTime(recordTime(row.records, "SAIDA_INTERVALO"))}</td><td>{formatTime(recordTime(row.records, "RETORNO_INTERVALO"))}</td><td>{formatTime(recordTime(row.records, "SAIDA_FINAL"))}</td><td><span className={`status-pill ${style.className}`}>{style.label}</span></td></tr>; }) : <tr><td colSpan={6} className="py-16 text-center text-stone-500">Nenhum servidor ativo cadastrado.</td></tr>}</tbody></table></div></section>;
}

function CreateEmployeeForm({ onCreated }: { onCreated: () => void }) {
  const utils = trpc.useUtils();
  const sectors = trpc.admin.sectors.useQuery();
  const create = trpc.admin.createEmployee.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.employees.invalidate(), utils.admin.dashboard.invalidate(), utils.employee.listForLogin.invalidate()]); toast.success("Servidor cadastrado com senha protegida."); onCreated(); }, onError: error => toast.error(error.message) });
  const createSector = trpc.admin.createSector.useMutation({ onSuccess: () => { utils.admin.sectors.invalidate(); toast.success("Setor criado."); }, onError: error => toast.error(error.message) });
  const [fullName, setFullName] = useState(""); const [registration, setRegistration] = useState(""); const [sectorId, setSectorId] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [newSector, setNewSector] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (password !== confirmPassword) return toast.error("A confirmação de senha não corresponde."); create.mutate({ fullName, registration, sectorId: sectorId ? Number(sectorId) : null, password }); };
  return <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="new-name" className="tiny-label">Nome completo</Label><Input id="new-name" value={fullName} onChange={event => setFullName(event.target.value)} required className="admin-input" /></div><div className="space-y-2"><Label htmlFor="new-reg" className="tiny-label">Matrícula</Label><Input id="new-reg" value={registration} onChange={event => setRegistration(event.target.value)} required className="admin-input" /></div><div className="space-y-2"><Label htmlFor="new-sector" className="tiny-label">Setor</Label><select id="new-sector" value={sectorId} onChange={event => setSectorId(event.target.value)} className="admin-select"><option value="">Sem setor</option>{sectors.data?.filter(sector => sector.active).map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="new-password" className="tiny-label">Senha inicial</Label><Input id="new-password" value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={4} required className="admin-input" /></div><div className="space-y-2"><Label htmlFor="confirm-password" className="tiny-label">Confirmar senha</Label><Input id="confirm-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} type="password" minLength={4} required className="admin-input" /></div></div><div className="flex flex-wrap items-center gap-2 border-t border-stone-900/10 pt-4"><Input value={newSector} onChange={event => setNewSector(event.target.value)} placeholder="Novo setor" className="h-9 max-w-[185px] rounded-none border-stone-900/20 text-sm" /><Button type="button" variant="outline" onClick={() => { if (newSector.trim()) createSector.mutate({ name: newSector }); }} disabled={createSector.isPending} className="h-9 rounded-none border-stone-900/25 text-xs">Adicionar setor</Button></div><Button type="submit" disabled={create.isPending} className="h-11 w-full rounded-none bg-stone-950 text-xs tracking-[0.15em]">{create.isPending ? <Loader2 className="animate-spin" /> : "Salvar servidor"}</Button></form>;
}

function SectorManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const sectors = trpc.admin.sectors.useQuery(undefined, { enabled: open });
  const create = trpc.admin.createSector.useMutation({ onSuccess: () => { utils.admin.sectors.invalidate(); toast.success("Setor criado."); }, onError: error => toast.error(error.message) });
  const [name, setName] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (name.trim()) create.mutate({ name }); };
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-none bg-[#f8f3e9] sm:max-w-xl"><DialogHeader><p className="tiny-label">Estrutura organizacional</p><DialogTitle className="font-serif text-3xl">Setores</DialogTitle></DialogHeader><form onSubmit={submit} className="flex gap-2 border-y border-stone-900/10 py-4"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Nome do setor" className="admin-input" /><Button type="submit" disabled={create.isPending} className="shrink-0 rounded-none bg-stone-950 text-xs tracking-[0.12em]">Adicionar</Button></form>{sectors.isError ? <div className="py-6 text-center"><p className="text-sm text-stone-600">Não foi possível consultar os setores.</p><Button variant="link" onClick={() => sectors.refetch()} className="mt-2 text-xs">Tentar novamente</Button></div> : <div className="divide-y divide-stone-900/10">{sectors.data?.map(sector => <SectorRow key={sector.id} sector={sector} />)}</div>}</DialogContent></Dialog>;
}

function SectorRow({ sector }: { sector: { id: number; name: string; active: boolean } }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(sector.name); const [active, setActive] = useState(sector.active);
  const update = trpc.admin.updateSector.useMutation({ onSuccess: () => { utils.admin.sectors.invalidate(); utils.admin.employees.invalidate(); toast.success("Setor atualizado."); }, onError: error => toast.error(error.message) });
  return <div className="flex items-center gap-2 py-3"><Input value={name} onChange={event => setName(event.target.value)} className="admin-input h-9 flex-1" /><Button type="button" variant="outline" onClick={() => setActive(value => !value)} className="h-9 rounded-none border-stone-900/25 text-xs">{active ? "Ativo" : "Inativo"}</Button><Button type="button" onClick={() => update.mutate({ sectorId: sector.id, name, active })} disabled={update.isPending} className="h-9 rounded-none bg-stone-950 px-3 text-xs">{update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</Button></div>;
}

function People() {
  const employees = trpc.admin.employees.useQuery();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [sectorsOpen, setSectorsOpen] = useState(false);
  const [selected, setSelected] = useState<EmployeeItem | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<EmployeeItem | null>(null);
  const update = trpc.admin.updateEmployee.useMutation({ onSuccess: () => { utils.admin.employees.invalidate(); utils.admin.dashboard.invalidate(); utils.employee.listForLogin.invalidate(); toast.success("Cadastro atualizado."); setSelected(null); }, onError: error => toast.error(error.message) });
  const reset = trpc.admin.resetPassword.useMutation({ onSuccess: () => { toast.success("Senha redefinida e sessões anteriores encerradas."); setPasswordTarget(null); }, onError: error => toast.error(error.message) });
  return <section className="admin-page"><div className="admin-title-row"><div><p className="tiny-label">Cadastros e acessos</p><h2 className="editorial-title mt-3 text-5xl">Servidores</h2><p className="mt-3 max-w-xl font-serif text-lg text-stone-600">Gerencie vínculos, setores e o acesso individual de cada servidor.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setSectorsOpen(true)} className="h-11 rounded-none border-stone-900/25 text-xs tracking-[0.12em]">Setores</Button><Button onClick={() => setCreateOpen(true)} className="h-11 rounded-none bg-stone-950 text-xs tracking-[0.14em]"><Plus className="mr-2 h-4 w-4" />Novo servidor</Button></div></div><div className="mt-10 grid gap-3">{employees.isLoading ? <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : employees.isError ? <div className="paper-card py-12 text-center"><p className="text-sm text-stone-600">Não foi possível carregar os servidores.</p><Button variant="link" onClick={() => employees.refetch()} className="mt-2 text-xs">Tentar novamente</Button></div> : employees.data?.map(employee => <article className="employee-row" key={employee.id}><div className="grid h-10 w-10 place-items-center rounded-full bg-stone-200 font-serif text-lg">{employee.fullName.charAt(0)}</div><div className="min-w-0 flex-1"><strong className="block truncate">{employee.fullName}</strong><span className="mt-1 block text-xs text-stone-500">{employee.registration} · {employee.sectorName ?? "Sem setor"}</span></div><span className={`status-pill ${employee.active ? "text-emerald-800 bg-emerald-100" : "text-stone-600 bg-stone-200"}`}>{employee.active ? "Ativo" : "Bloqueado"}</span><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setPasswordTarget(employee)} title="Redefinir senha"><LockKeyhole className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setSelected(employee)} title="Editar cadastro"><UserCog className="h-4 w-4" /></Button></div></article>)}</div><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-none bg-[#f8f3e9] sm:max-w-xl"><DialogHeader><p className="tiny-label">Novo cadastro</p><DialogTitle className="font-serif text-3xl">Adicionar servidor</DialogTitle></DialogHeader><CreateEmployeeForm onCreated={() => setCreateOpen(false)} /></DialogContent></Dialog><SectorManager open={sectorsOpen} onClose={() => setSectorsOpen(false)} /><EditEmployeeDialog employee={selected} onClose={() => setSelected(null)} onSave={input => update.mutate(input)} isSaving={update.isPending} /><ResetPasswordDialog employee={passwordTarget} onClose={() => setPasswordTarget(null)} onSave={password => passwordTarget && reset.mutate({ employeeId: passwordTarget.id, password })} isSaving={reset.isPending} /></section>;
}

function EditEmployeeDialog({ employee, onClose, onSave, isSaving }: { employee: EmployeeItem | null; onClose: () => void; onSave: (value: { employeeId: number; fullName: string; registration: string; sectorId: number | null; active: boolean }) => void; isSaving: boolean }) {
  const sectors = trpc.admin.sectors.useQuery();
  const [fullName, setFullName] = useState(""); const [registration, setRegistration] = useState(""); const [sectorId, setSectorId] = useState(""); const [active, setActive] = useState(true);
  const sync = (open: boolean) => { if (open && employee) { setFullName(employee.fullName); setRegistration(employee.registration); setSectorId(employee.sectorId ? String(employee.sectorId) : ""); setActive(employee.active); } if (!open) onClose(); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (employee) onSave({ employeeId: employee.id, fullName, registration, sectorId: sectorId ? Number(sectorId) : null, active }); };
  return <Dialog open={Boolean(employee)} onOpenChange={sync}><DialogContent className="rounded-none bg-[#f8f3e9] sm:max-w-lg"><DialogHeader><p className="tiny-label">Gestão de cadastro</p><DialogTitle className="font-serif text-3xl">Editar servidor</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label className="tiny-label">Nome completo</Label><Input value={fullName} onChange={event => setFullName(event.target.value)} required className="admin-input" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label className="tiny-label">Matrícula</Label><Input value={registration} onChange={event => setRegistration(event.target.value)} required className="admin-input" /></div><div className="space-y-2"><Label className="tiny-label">Setor</Label><select value={sectorId} onChange={event => setSectorId(event.target.value)} className="admin-select"><option value="">Sem setor</option>{sectors.data?.map(sector => <option value={sector.id} key={sector.id}>{sector.name}</option>)}</select></div></div><label className="flex items-center justify-between border-y border-stone-900/10 py-4"><span><strong className="text-sm">Acesso do servidor</strong><span className="mt-1 block text-xs text-stone-500">Desativar encerra as sessões existentes.</span></span><button type="button" onClick={() => setActive(value => !value)} className={`toggle-control ${active ? "toggle-control-on" : ""}`} aria-pressed={active}><span /></button></label><Button type="submit" disabled={isSaving} className="h-11 w-full rounded-none bg-stone-950 text-xs tracking-[0.15em]">{isSaving ? <Loader2 className="animate-spin" /> : active ? "Salvar alterações" : "Bloquear acesso"}</Button></form></DialogContent></Dialog>;
}

function ResetPasswordDialog({ employee, onClose, onSave, isSaving }: { employee: EmployeeItem | null; onClose: () => void; onSave: (password: string) => void; isSaving: boolean }) {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (password !== confirm) return toast.error("A confirmação de senha não corresponde."); onSave(password); };
  return <Dialog open={Boolean(employee)} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="rounded-none bg-[#f8f3e9] sm:max-w-md"><DialogHeader><p className="tiny-label">Segurança de acesso</p><DialogTitle className="font-serif text-3xl">Redefinir senha</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><p className="text-sm leading-relaxed text-stone-600">Uma nova senha será definida para <strong>{employee?.fullName}</strong>. As sessões deste servidor serão encerradas.</p><div className="space-y-2"><Label className="tiny-label">Nova senha</Label><Input value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={4} required className="admin-input" /></div><div className="space-y-2"><Label className="tiny-label">Confirmar nova senha</Label><Input value={confirm} onChange={event => setConfirm(event.target.value)} type="password" minLength={4} required className="admin-input" /></div><Button type="submit" disabled={isSaving} className="h-11 w-full rounded-none bg-stone-950 text-xs tracking-[0.15em]">{isSaving ? <Loader2 className="animate-spin" /> : "Confirmar redefinição"}</Button></form></DialogContent></Dialog>;
}

function Reports() {
  const employees = trpc.admin.employees.useQuery();
  const [startDate, setStartDate] = useState(businessDateNow); const [endDate, setEndDate] = useState(businessDateNow); const [employeeId, setEmployeeId] = useState("");
  const reportInput = useMemo(() => ({ startDate, endDate, ...(employeeId ? { employeeId: Number(employeeId) } : {}) }), [startDate, endDate, employeeId]);
  const report = trpc.admin.report.useQuery(reportInput);
  return <section className="admin-page"><div className="admin-title-row"><div><p className="tiny-label">Leitura histórica</p><h2 className="editorial-title mt-3 text-5xl">Relatórios</h2><p className="mt-3 max-w-xl font-serif text-lg text-stone-600">Acompanhe jornadas completas, incompletas e os totais apurados em cada dia de trabalho.</p></div></div><div className="report-filter mt-10"><div><Label className="tiny-label">De</Label><Input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="admin-input mt-2" /></div><div><Label className="tiny-label">Até</Label><Input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="admin-input mt-2" /></div><div className="min-w-[220px]"><Label className="tiny-label">Servidor</Label><select value={employeeId} onChange={event => setEmployeeId(event.target.value)} className="admin-select mt-2"><option value="">Todos os servidores</option>{employees.data?.map(employee => <option value={employee.id} key={employee.id}>{employee.fullName}</option>)}</select></div></div><div className="admin-table-card mt-8 overflow-x-auto"><table><thead><tr><th>Data e servidor</th><th>Jornada</th><th>Trabalhado</th><th>Intervalo</th><th>Situação</th></tr></thead><tbody>{report.isLoading ? <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : report.isError ? <tr><td colSpan={5} className="py-16 text-center"><p className="text-stone-600">Não foi possível gerar o relatório solicitado.</p><Button variant="link" onClick={() => report.refetch()} className="mt-2 text-xs">Tentar novamente</Button></td></tr> : report.data?.length ? report.data.map((day, index) => <tr key={`${day.businessDate}-${day.employee?.id}-${index}`}><td><strong>{day.employee?.fullName ?? "Servidor indisponível"}</strong><small>{day.businessDate.split("-").reverse().join("/")} · {day.employee?.registration ?? "—"}</small></td><td className="font-serif text-lg">{formatTime(recordTime(day.records, "ENTRADA"))} <span className="text-stone-300">—</span> {formatTime(recordTime(day.records, "SAIDA_FINAL"))}</td><td>{formatDuration(day.summary.workedSeconds)}</td><td>{formatDuration(day.summary.intervalSeconds)}</td><td><span className={`status-pill ${day.summary.isComplete ? "text-sky-800 bg-sky-100" : "text-amber-800 bg-amber-100"}`}>{day.summary.isComplete ? "Completa" : "Incompleta"}</span></td></tr>) : <tr><td colSpan={5} className="py-16 text-center text-stone-500">Não há batidas registradas para o filtro selecionado.</td></tr>}</tbody></table></div></section>;
}

function Workspace() {
  const [tab, setTab] = useState<Tab>("overview");
  return <main className="admin-shell min-h-screen"><AdminHeader tab={tab} setTab={setTab} />{tab === "overview" ? <Overview /> : tab === "people" ? <People /> : <Reports />}</main>;
}

export default function Admin() {
  const { loading, user } = useAuth(); const [, setLocation] = useLocation();
  if (loading) return <main className="editorial-shell grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  if (!user) return <AdminLogin />;
  if (user.role !== "admin") return <main className="admin-shell"><header className="admin-header justify-between"><Button variant="ghost" onClick={() => setLocation("/")} className="text-xs tracking-[0.14em]">Voltar ao ponto</Button></header><section className="admin-page"><div className="paper-card max-w-md p-8 text-center"><CircleAlert className="mx-auto h-6 w-6 text-amber-700" /><h1 className="mt-5 font-serif text-3xl">Acesso não autorizado</h1><p className="mt-3 text-stone-600">A sua conta não possui permissão administrativa.</p><Button variant="outline" onClick={() => setLocation("/")} className="mt-6 rounded-none border-stone-900/25">Voltar</Button></div></section></main>;
  return <Workspace />;
}

function AdminLogin() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Acesso administrativo confirmado.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loginValue || !password) {
      toast.error("Informe o usuário e a senha.");
      return;
    }
    login.mutate({ login: loginValue, password });
  };

  return (
    <main className="login-shell flex min-h-screen flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
      <div className="login-frame flex flex-1 flex-col">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1d4a2f] font-serif text-sm font-bold tracking-[0.14em] text-white">CP</span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1d4a2f]">Sistema de gestão de jornada</p>
              <p className="text-[11px] text-stone-500">Departamento de Tecnologia · SME</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")} className="h-9 rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4a2f] hover:bg-[#e4ece6] hover:text-[#143a27]">Voltar ao ponto</Button>
        </header>
        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-md rounded-3xl border border-[#e5e7e0] bg-white p-7 shadow-[0_24px_48px_-28px_rgba(22,50,36,0.4)] sm:p-9">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e4f0e8]"><ShieldCheck className="h-5 w-5 text-[#1d4a2f]" strokeWidth={1.8} /></span>
            <h2 className="mt-6 font-serif text-4xl font-bold tracking-tight text-[#163224]">Administração</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">Acesse com a sua conta administrativa para gerenciar servidores e jornadas.</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-login" className="login-label">Usuário (e-mail ou nome)</Label>
                <Input id="admin-login" value={loginValue} onChange={event => setLoginValue(event.target.value)} autoComplete="username" className="login-input" placeholder="Informe seu usuário" disabled={login.isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="login-label">Senha</Label>
                <div className="relative">
                  <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="login-input pr-12" placeholder="Sua senha de acesso" disabled={login.isPending} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-1 top-1 h-10 w-10 rounded-lg text-stone-400 hover:text-[#1d4a2f]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                </div>
              </div>
              <Button type="submit" disabled={login.isPending} className="login-btn">{login.isPending ? <Loader2 className="animate-spin" /> : "Entrar na administração"}</Button>
            </form>
            <p className="mt-6 border-t border-[#eef0ea] pt-4 text-xs leading-relaxed text-stone-500">Acesso restrito ao Departamento de Tecnologia da SME. As credenciais são guardadas de forma protegida.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
