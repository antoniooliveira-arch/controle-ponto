import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PUNCH_LABELS, PUNCH_MARKS, PUNCH_SHORT_LABELS, formatDate, formatDuration, formatTime, recordTime, type PunchType } from "@/lib/attendance";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, CircleAlert, Clock3, DoorOpen, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="flex items-baseline gap-3">
      <span className="editorial-clock">{formatTime(now)}</span>
      <span className="tiny-label">Horário de Brasília</span>
    </div>
  );
}

function LoginScreen() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const employees = trpc.employee.listForLogin.useQuery();
  const login = trpc.employee.login.useMutation({
    onSuccess: async () => {
      await utils.employee.me.invalidate();
      toast.success("Acesso confirmado.");
    },
    onError: error => toast.error(error.message),
  });
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId || !password) {
      toast.error("Selecione seu nome e informe a senha.");
      return;
    }
    login.mutate({ employeeId: Number(employeeId), password });
  };

  return (
    <main className="editorial-shell min-h-screen px-5 py-5 sm:p-8 lg:p-12">
      <div className="editorial-frame mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1440px] flex-col sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between border-b border-stone-900/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center border border-stone-900 text-[10px] font-bold tracking-[0.18em]">CP</span>
            <span className="tiny-label">Sistema de gestão de jornada</span>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/administracao")} className="text-xs tracking-[0.14em] hover:bg-stone-900 hover:text-stone-50">
            Administração <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
          <div className="relative max-w-3xl py-6 lg:py-14">
            <p className="tiny-label mb-7">Ponto diário · 4 etapas obrigatórias</p>
            <h1 className="editorial-title max-w-3xl text-5xl leading-[0.93] sm:text-7xl xl:text-8xl">O tempo que organiza o serviço público.</h1>
            <p className="mt-8 max-w-md font-serif text-lg leading-relaxed text-stone-700">Registre sua jornada com clareza. Cada movimento é conferido no momento certo, com precisão e segurança.</p>
            <div className="absolute -left-2 top-3 hidden h-12 w-12 border-l border-t border-stone-950/55 lg:block" />
          </div>

          <form onSubmit={submit} className="paper-card relative mx-auto w-full max-w-md p-7 sm:p-9">
            <div className="mb-9 flex items-start justify-between border-b border-stone-900/15 pb-5">
              <div>
                <p className="tiny-label">Acesso do servidor</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold">Identificação</h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-stone-600" strokeWidth={1.4} />
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="employee" className="tiny-label">Servidor</Label>
                <select id="employee" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={employees.isLoading || login.isPending} className="editorial-input h-12 w-full px-3 text-sm">
                  <option value="">{employees.isLoading ? "Carregando nomes…" : "Selecione seu nome"}</option>
                  {employees.data?.map(employee => <option value={String(employee.id)} key={employee.id}>{employee.fullName} · {employee.registration}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="tiny-label">Senha</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="editorial-input h-12 rounded-none px-3" placeholder="Sua senha de acesso" disabled={login.isPending} />
              </div>
              <Button type="submit" disabled={login.isPending || employees.isLoading || !employees.data?.length} className="h-12 w-full rounded-none bg-stone-950 text-xs tracking-[0.16em] hover:bg-stone-800">
                {login.isPending ? <Loader2 className="animate-spin" /> : "Acessar jornada"}
              </Button>
            </div>
            {employees.isError ? <div className="mt-5 border-t border-stone-900/10 pt-4"><p className="text-sm leading-relaxed text-stone-600">Não foi possível carregar a lista de servidores.</p><Button type="button" variant="link" onClick={() => employees.refetch()} className="mt-2 h-auto p-0 text-xs tracking-[0.12em]">Tentar novamente</Button></div> : !employees.isLoading && !employees.data?.length ? <p className="mt-5 border-t border-stone-900/10 pt-4 text-sm leading-relaxed text-stone-600">Ainda não há servidores ativos. Solicite ao administrador o seu cadastro.</p> : <p className="mt-5 border-t border-stone-900/10 pt-4 text-xs leading-relaxed text-stone-500">Sua senha é processada de forma protegida. O sistema não armazena senhas em texto aberto.</p>}
          </form>
        </section>
        <footer className="flex flex-col justify-between gap-3 border-t border-stone-900/15 py-5 text-[10px] uppercase tracking-[0.16em] text-stone-500 sm:flex-row">
          <span>Controle de ponto · operação diária</span><span>Registro protegido e sequencial</span>
        </footer>
      </div>
    </main>
  );
}

function EmployeeDashboard({ employee }: { employee: { fullName: string; registration: string; sectorName: string | null } }) {
  const utils = trpc.useUtils();
  const attendance = trpc.attendance.today.useQuery(undefined, { refetchInterval: 60_000 });
  const logout = trpc.employee.logout.useMutation({ onSuccess: () => utils.employee.me.invalidate() });
  const punch = trpc.attendance.punch.useMutation({
    onSuccess: async data => {
      await utils.attendance.today.invalidate();
      const recordedType = data.recordedType as PunchType;
      toast.success(`${PUNCH_SHORT_LABELS[recordedType]} registrada às ${formatTime(data.records.at(-1)?.recordedAt)}.`);
    },
    onError: error => toast.error(error.message),
  });

  const current = attendance.data;
  const summary = current?.summary;
  const nextType = summary?.nextType as PunchType | null | undefined;
  const doneCount = current?.records.length ?? 0;

  if (attendance.isError) {
    return <main className="editorial-shell grid min-h-screen place-items-center p-5"><section className="paper-card max-w-md p-8 text-center"><CircleAlert className="mx-auto h-6 w-6 text-amber-700" /><h1 className="mt-5 font-serif text-3xl">Não foi possível consultar sua jornada</h1><p className="mt-3 text-sm leading-relaxed text-stone-600">Verifique sua conexão e atualize os registros antes de realizar uma nova batida.</p><Button onClick={() => attendance.refetch()} className="mt-6 h-10 rounded-none bg-stone-950 text-xs tracking-[0.14em]">Tentar novamente</Button></section></main>;
  }

  return (
    <main className="editorial-shell min-h-screen px-5 py-5 sm:p-8 lg:p-12">
      <div className="editorial-frame mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-stone-900/15 pb-5">
          <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center border border-stone-900 text-[10px] font-bold tracking-[0.18em]">CP</span><span className="tiny-label">Jornada do servidor</span></div>
          <div className="flex items-center gap-5"><LiveClock /><Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="text-xs tracking-[0.14em]"><LogOut className="mr-2 h-3.5 w-3.5" />Sair</Button></div>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-14">
          <div>
            <p className="tiny-label">{formatDate(new Date())}</p>
            <h1 className="editorial-title mt-4 text-5xl leading-[0.94] sm:text-7xl">Olá, {employee.fullName.split(" ")[0]}.</h1>
            <div className="mt-10 border-y border-stone-900/15 py-6">
              <p className="tiny-label">Próxima batida permitida</p>
              {attendance.isLoading ? <Loader2 className="mt-5 h-7 w-7 animate-spin text-stone-500" /> : nextType ? <><h2 className="mt-3 font-serif text-3xl font-semibold">{PUNCH_SHORT_LABELS[nextType]}</h2><Button onClick={() => punch.mutate()} disabled={punch.isPending} className="mt-6 h-14 rounded-none bg-stone-950 px-7 text-xs tracking-[0.17em] hover:bg-stone-800">{punch.isPending ? <Loader2 className="animate-spin" /> : <><Clock3 className="mr-3 h-4 w-4" />{PUNCH_LABELS[nextType]}</>}</Button></> : <><h2 className="mt-3 font-serif text-3xl font-semibold">Jornada encerrada</h2><p className="mt-3 text-stone-600">As quatro etapas previstas para hoje foram registradas.</p></>}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-stone-600"><span>Matrícula <strong className="ml-2 font-medium text-stone-900">{employee.registration}</strong></span>{employee.sectorName ? <span>Setor <strong className="ml-2 font-medium text-stone-900">{employee.sectorName}</strong></span> : null}</div>
          </div>

          <aside className="paper-card p-7 sm:p-9">
            <div className="mb-7 flex items-end justify-between"><div><p className="tiny-label">Ritmo de hoje</p><p className="mt-2 font-serif text-2xl">{doneCount} de 4 registros</p></div><span className="text-xs tracking-[0.15em] text-stone-500">{summary?.isComplete ? "COMPLETA" : "EM CURSO"}</span></div>
            <div className="h-px bg-stone-900/15"><div className="h-px bg-stone-900 transition-all" style={{ width: `${doneCount * 25}%` }} /></div>
            <dl className="mt-8 grid grid-cols-2 gap-6"><div><dt className="tiny-label">Trabalhado</dt><dd className="mt-2 font-serif text-3xl">{formatDuration(summary?.workedSeconds ?? 0)}</dd></div><div><dt className="tiny-label">Intervalo</dt><dd className="mt-2 font-serif text-3xl">{formatDuration(summary?.intervalSeconds ?? 0)}</dd></div></dl>
            <p className="mt-8 border-t border-stone-900/15 pt-5 text-sm leading-relaxed text-stone-600">Os horários são definidos pelo servidor da aplicação e a sequência não pode ser alterada nesta tela.</p>
          </aside>
        </section>

        <section className="border-t border-stone-900/15 py-8 lg:py-10">
          <div className="mb-7 flex items-center justify-between"><div><p className="tiny-label">Batidas de hoje</p><h2 className="mt-2 font-serif text-3xl">Registro da jornada</h2></div><span className="font-serif text-xl text-stone-500">{current?.businessDate.split("-").reverse().join("/")}</span></div>
          <div className="grid gap-px overflow-hidden bg-stone-900/15 md:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(PUNCH_SHORT_LABELS) as PunchType[]).map((type, index) => {
              const timestamp = recordTime(current?.records ?? [], type);
              return <article className="bg-[#f5f0e7] p-5" key={type}><div className="flex items-start justify-between"><span className="tiny-label">{PUNCH_MARKS[type]}</span><span className={`h-2 w-2 rounded-full ${timestamp ? "bg-stone-900" : "bg-stone-300"}`} /></div><p className="mt-8 text-sm text-stone-600">{PUNCH_SHORT_LABELS[type]}</p><p className="mt-2 font-serif text-3xl">{timestamp ? formatTime(timestamp) : "—"}</p><p className="mt-3 text-[11px] uppercase tracking-[0.13em] text-stone-500">{timestamp ? "Registrada" : index === doneCount ? "Aguardando" : "Pendente"}</p></article>;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  const session = trpc.employee.me.useQuery();
  if (session.isLoading) return <main className="editorial-shell grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-stone-600" /></main>;
  return session.data ? <EmployeeDashboard employee={session.data} /> : <LoginScreen />;
}
