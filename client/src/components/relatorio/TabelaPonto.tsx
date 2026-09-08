import { MONTHS, type DayRow } from "@/lib/report";

const HEADERS = ["DIA", "SEM", "ENTRADA", "ASSINATURA", "SAÍDA", "ENTRADA", "SAÍDA", "ASSINATURA", "RESP/DIRETO"];

export function TabelaPonto({
  year,
  month,
  days,
}: {
  year: number;
  month: number;
  days: DayRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px] leading-none">
        <caption className="sr-only">
          Folha diária de controle de ponto — {MONTHS[month - 1]} {year}
        </caption>
        <thead>
          <tr>
            {HEADERS.map(header => (
              <th
                key={header}
                className={`border border-stone-800/70 bg-stone-900 px-1.5 py-1.5 font-medium tracking-[0.08em] text-[#fbf7ee] ${header === "ASSINATURA" || header === "RESP/DIRETO" ? "text-left" : "text-center"}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, index) => (
            <tr
              key={day.day}
              className={day.isHoliday ? "bg-stone-200/60 text-stone-500" : index % 2 ? "bg-white/40" : "bg-white/80"}
            >
              <td className="border border-stone-800/70 px-1.5 py-1 text-center font-medium">
                {String(day.day).padStart(2, "0")}
                {day.marked && <sup className="text-[8px] text-[#1d4a2f]">*</sup>}
              </td>
              <td className="border border-stone-800/70 px-1.5 py-1 text-center font-medium">{day.weekday}</td>
              <td className={`border border-stone-800/70 px-1.5 py-1 text-center ${day.entrada1 ? "font-semibold text-stone-900" : ""}`}>
                {day.entrada1}
              </td>
              <td className="border border-stone-800/70 px-1.5 py-1 text-left">
                {day.isHoliday && day.marked && <span className="text-[9px] italic text-stone-400">{day.holidayDescription}</span>}
              </td>
              <td className="border border-stone-800/70 px-1.5 py-1 text-center">{day.saida1}</td>
              <td className="border border-stone-800/70 px-1.5 py-1 text-center">{day.entrada2}</td>
              <td className="border border-stone-800/70 px-1.5 py-1 text-center">{day.saida2}</td>
              <td className="border border-stone-800/70 px-1.5 py-1" />
              <td className="border border-stone-800/70 px-1.5 py-1" />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] italic text-stone-500">
        * Fim de semana ou feriado — não registrar horários de frequência.
      </p>
    </div>
  );
}