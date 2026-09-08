import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function GestaoFeriados() {
  const utils = trpc.useUtils();
  const holidays = trpc.admin.holidays.useQuery();
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const add = trpc.admin.addHoliday.useMutation({
    onSuccess: () => {
      utils.admin.holidays.invalidate();
      setDate("");
      setDescription("");
      toast.success("Feriado cadastrado.");
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.admin.removeHoliday.useMutation({
    onSuccess: () => {
      utils.admin.holidays.invalidate();
      toast.success("Feriado removido.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (date) add.mutate({ date, description });
  };

  return (
    <div className="paper-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="tiny-label">Feriados nacionais / locais</p>
          <p className="mt-1 text-sm text-stone-600">
            Os dias marcados como feriado não recebem horários na folha.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="tiny-label">Data</Label>
          <Input type="date" value={date} onChange={event => setDate(event.target.value)} className="admin-input h-9 w-[150px]" required />
        </div>
        <div className="space-y-1">
          <Label className="tiny-label">Descrição (opcional)</Label>
          <Input value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex.: Aniversário da cidade" className="admin-input h-9 w-[220px]" />
        </div>
        <Button type="submit" disabled={add.isPending} className="h-9 rounded-none bg-[#1d4a2f] text-xs">
          {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Cadastrar
        </Button>
      </form>
      <div className="mt-4 max-h-56 overflow-y-auto divide-y divide-stone-900/10">
        {holidays.isLoading ? (
          <p className="py-4 text-center text-sm text-stone-500">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </p>
        ) : holidays.data?.length ? (
          holidays.data.map(holiday => (
            <div key={holiday.id} className="flex items-center gap-3 py-2">
              <span className="font-mono text-xs text-stone-800">{holiday.date.split("-").reverse().join("/")}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-stone-600">{holiday.description ?? "Feriado"}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ date: holiday.date })}
                className="h-8 w-8 text-stone-400 hover:text-red-700"
                title="Remover feriado"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-stone-500">Nenhum feriado cadastrado.</p>
        )}
      </div>
    </div>
  );
}