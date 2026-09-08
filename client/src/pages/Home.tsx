import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { PUNCH_LABELS, PUNCH_MARKS, PUNCH_SHORT_LABELS, formatDate, formatDuration, formatTime, recordTime, requestGeolocation, type PunchType } from "@/lib/attendance";
import { trpc } from "@/lib/trpc";
import { CircleAlert, Eye, EyeOff, Loader2, LogOut, MapPin, Settings2 } from "lucide-react";
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
      <span className="tiny-label">Horário de Cuiabá</span>
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
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId || !password) {
      toast.error("Selecione seu nome e informe a senha.");
      return;
    }
    login.mutate({ employeeId: Number(employeeId), password });
  };

  return (
    <main className="login-shell flex min-h-screen flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
      <div className="login-frame flex flex-1 flex-col">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1d4a2f] font-serif text-sm font-bold tracking-[0.14em] text-white">CP</span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1d4a2f]">Sistema de gestão de jornada</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/administracao")} className="h-9 rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4a2f] hover:bg-[#e4ece6] hover:text-[#143a27]">
            <Settings2 className="h-3.5 w-3.5" /> Administração
          </Button>
        </header>

        <section className="grid flex-1 items-center py-2 lg:py-4">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-[#e5e7e0] bg-white p-6 shadow-[0_24px_48px_-28px_rgba(22,50,36,0.4)] sm:p-7">
            <p className="login-label text-[#2e7d4e]">Acesso do servidor</p>
            <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#163224]">Identificação</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">Faça login para registrar sua jornada de trabalho.</p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee" className="login-label">Servidor</Label>
                <select id="employee" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={employees.isLoading || login.isPending} className="login-input">
                  <option value="">{employees.isLoading ? "Carregando nomes…" : "Selecione seu nome"}</option>
                  {employees.data?.map(employee => <option value={String(employee.id)} key={employee.id}>{employee.fullName} · {employee.registration}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="login-label">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="login-input pr-12" placeholder="Sua senha de acesso" disabled={login.isPending} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-1 top-1 h-10 w-10 rounded-lg text-stone-400 hover:text-[#1d4a2f]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={login.isPending || employees.isLoading || !employees.data?.length} className="login-btn">
                {login.isPending ? <Loader2 className="animate-spin" /> : "Acessar jornada"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button type="button" variant="link" onClick={() => toast.info("Para redefinir sua senha, procure o administrador responsável pelo cadastro.")} className="h-auto p-0 text-xs font-semibold text-[#2e7d4e] underline-offset-4 hover:text-[#1d4a2f]">Esqueceu sua senha?</Button>
            </div>

            <div className="mt-4 border-t border-[#eef0ea] pt-3">
              <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success("Link do aplicativo copiado."); }} className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80">
                <QRCodeSVG value={window.location.origin} size={56} fgColor="#1d4a2f" bgColor="transparent" className="shrink-0 rounded-lg border border-[#e5e7e0] p-1" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#1d4a2f]">Acessar no celular</span>
                  <span className="mt-1 block text-xs leading-relaxed text-stone-500">Escaneie o QR Code ou toque para copiar o link e abrir o aplicativo rapidamente.</span>
                </span>
              </button>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#e5e7e0] px-3 py-1.5">
                <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-[0.13em] text-[#2e7d4e]">Link curto</span><a href="https://spoo.me/RalbeqE" target="_blank" rel="noreferrer" className="block truncate text-sm text-[#1d4a2f] hover:underline">spoo.me/RalbeqE</a></span>
                <Button type="button" variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText("https://spoo.me/RalbeqE"); toast.success("Link curto copiado."); }} className="shrink-0 text-xs font-semibold text-[#2e7d4e]">Copiar</Button>
              </div>
            </div>

            {employees.isError ? <div className="mt-4 border-t border-[#eef0ea] pt-3"><p className="text-sm leading-relaxed text-stone-600">Não foi possível carregar a lista de servidores.</p><Button type="button" variant="link" onClick={() => employees.refetch()} className="mt-1 h-auto p-0 text-xs font-semibold text-[#2e7d4e]">Tentar novamente</Button></div> : !employees.isLoading && !employees.data?.length ? <p className="mt-4 border-t border-[#eef0ea] pt-3 text-sm leading-relaxed text-stone-600">Ainda não há servidores ativos. Solicite ao administrador o seu cadastro.</p> : <p className="mt-4 border-t border-[#eef0ea] pt-3 text-xs leading-relaxed text-stone-500">Sua senha é processada de forma protegida. O sistema não armazena senhas em texto aberto.</p>}
          </div>
        </section>

        <footer className="flex justify-center border-t border-[#e5e7e0] py-3">
          <span className="font-bold text-stone-900" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 11 }}>Desenvolvido Pelo Departamento de Tecnologia da SME.</span>
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
  const [geoBusy, setGeoBusy] = useState(false);

  const handlePunch = async () => {
    if (punch.isPending || geoBusy) return;
    setGeoBusy(true);
    try {
      const { latitude, longitude } = await requestGeolocation();
      punch.mutate({ latitude, longitude });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível obter a localização.");
    } finally {
      setGeoBusy(false);
    }
  };

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
              {attendance.isLoading ? <Loader2 className="mt-5 h-7 w-7 animate-spin text-stone-500" /> : nextType ? <><h2 className="mt-3 font-serif text-3xl font-semibold">{PUNCH_SHORT_LABELS[nextType]}</h2><Button onClick={handlePunch} disabled={punch.isPending || geoBusy} className="mt-6 h-14 rounded-none bg-stone-950 px-7 text-xs tracking-[0.17em] hover:bg-stone-800">{punch.isPending || geoBusy ? <Loader2 className="animate-spin" /> : <><MapPin className="mr-3 h-4 w-4" />{PUNCH_LABELS[nextType]}</>}</Button><p className="mt-3 text-xs leading-relaxed text-stone-500">A batida requer a localização do dispositivo. Autorize o acesso quando o navegador solicitar.</p></> : <><h2 className="mt-3 font-serif text-3xl font-semibold">Jornada encerrada</h2><p className="mt-3 text-stone-600">As quatro etapas previstas para hoje foram registradas.</p></>}
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
              const record = current?.records.find(item => item.type === type);
              return <article className="bg-[#f5f0e7] p-5" key={type}><div className="flex items-start justify-between"><span className="tiny-label">{PUNCH_MARKS[type]}</span><span className={`h-2 w-2 rounded-full ${timestamp ? "bg-stone-900" : "bg-stone-300"}`} /></div><p className="mt-8 text-sm text-stone-600">{PUNCH_SHORT_LABELS[type]}</p><p className="mt-2 font-serif text-3xl">{timestamp ? formatTime(timestamp) : "—"}</p><p className="mt-3 text-[11px] uppercase tracking-[0.13em] text-stone-500">{timestamp ? "Registrada" : index === doneCount ? "Aguardando" : "Pendente"}</p>{record?.latitude != null && record.longitude != null ? <p className="mt-2 flex items-center gap-1 text-[11px] uppercase tracking-[0.13em] text-stone-500"><MapPin className="h-3 w-3 shrink-0" />{record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}</p> : null}</article>;
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
