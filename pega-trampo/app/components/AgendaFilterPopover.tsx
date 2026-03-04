"use client"

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

type AgendaMode = "single" | "range"

export type AgendaFilterValue = {
    mode: AgendaMode
    startDate: string | null // YYYY-MM-DD
    endDate: string | null   // YYYY-MM-DD (só no range)
}

type Props = {
    open: boolean
    anchorRef: React.RefObject<HTMLElement>
    onClose: () => void
    onApply: (value: AgendaFilterValue) => void
    initialValue?: Partial<AgendaFilterValue>
    title?: string
}

function pad2(n: number) {
    return String(n).padStart(2, "0")
}

function toISODate(d: Date) {
    // YYYY-MM-DD (sem timezone)
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
}

function fromISODate(s: string) {
    // interpreta como local (00:00)
    const [y, m, d] = s.split("-").map(Number)
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

// semana começando na segunda (pt-BR)
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

export default function AgendaFilterPopover({
    open,
    anchorRef,
    onClose,
    onApply,
    initialValue,
    title = "Agenda",
}: Props) {
    const popRef = useRef<HTMLDivElement>(null)

    const [mode, setMode] = useState<AgendaMode>(initialValue?.mode ?? "single")
    const [startISO, setStartISO] = useState<string | null>(initialValue?.startDate ?? null)
    const [endISO, setEndISO] = useState<string | null>(initialValue?.endDate ?? null)

    const today = useMemo(() => new Date(), [])
    const [cursorMonth, setCursorMonth] = useState<Date>(() => {
        const base = startISO ? fromISODate(startISO) : new Date()
        return new Date(base.getFullYear(), base.getMonth(), 1)
    })

    // posição do popover (fixo na tela)
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    const [arrow, setArrow] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

    // Reposiciona ao abrir / resize / scroll
    const computePosition = () => {
        const anchor = anchorRef.current
        const pop = popRef.current
        if (!anchor || !pop) return

        const a = anchor.getBoundingClientRect()
        const p = pop.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight

        // Diagonal inferior direita do botão:
        // top = bottom + 8
        // left = left + 8
        let top = a.bottom + 8
        let left = a.left + 8

        // clamp pra caber na viewport
        top = clamp(top, 8, vh - p.height - 8)
        left = clamp(left, 8, vw - p.width - 8)

        setPos({ top, left })

        // seta (arrow) tenta apontar pro botão
        const arrowLeft = clamp(a.left + a.width * 0.25 - left, 16, p.width - 16)
        setArrow({ top: 10, left: arrowLeft })
    }

    useLayoutEffect(() => {
        if (!open) return
        // espera render
        requestAnimationFrame(() => computePosition())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    useEffect(() => {
        if (!open) return
        const onResize = () => computePosition()
        window.addEventListener("resize", onResize)
        window.addEventListener("scroll", onResize, true)
        return () => {
            window.removeEventListener("resize", onResize)
            window.removeEventListener("scroll", onResize, true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Fecha com ESC + clique fora
    useEffect(() => {
        if (!open) return

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }

        const onMouseDown = (e: MouseEvent) => {
            const pop = popRef.current
            const anchor = anchorRef.current
            const target = e.target as Node
            if (!pop) return
            const clickedInsidePopover = pop.contains(target)
            const clickedAnchor = anchor ? anchor.contains(target) : false
            if (!clickedInsidePopover && !clickedAnchor) onClose()
        }

        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("mousedown", onMouseDown)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("mousedown", onMouseDown)
        }
    }, [open, onClose, anchorRef])

    const startDate = useMemo(() => (startISO ? fromISODate(startISO) : null), [startISO])
    const endDate = useMemo(() => (endISO ? fromISODate(endISO) : null), [endISO])

    const monthLabel = useMemo(() => {
        const fmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
        return fmt.format(cursorMonth)
    }, [cursorMonth])

    const daysGrid = useMemo(() => {
        const first = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), 1)
        const last = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 0)

        // JS: 0=Dom,1=Seg... queremos 0=Seg
        const jsFirstDay = first.getDay() // 0..6
        const offset = (jsFirstDay + 6) % 7 // transforma: Seg=0, Dom=6

        const totalDays = last.getDate()
        const cells: Array<{ date: Date | null; iso: string | null }> = []

        for (let i = 0; i < offset; i++) cells.push({ date: null, iso: null })
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), d)
            cells.push({ date, iso: toISODate(date) })
        }

        // completa linhas (7 colunas)
        while (cells.length % 7 !== 0) cells.push({ date: null, iso: null })
        return cells
    }, [cursorMonth])

    const isInRange = (d: Date) => {
        if (!startDate || !endDate) return false
        const t = d.getTime()
        const a = startDate.getTime()
        const b = endDate.getTime()
        const min = Math.min(a, b)
        const max = Math.max(a, b)
        return t >= min && t <= max
    }

    const onPickDay = (iso: string) => {
        if (mode === "single") {
            setStartISO(iso)
            setEndISO(null)
            return
        }

        // range
        if (!startISO || (startISO && endISO)) {
            setStartISO(iso)
            setEndISO(null)
            return
        }

        // se tem start mas não tem end
        const a = fromISODate(startISO)
        const b = fromISODate(iso)
        if (b.getTime() < a.getTime()) {
            // clicou antes do start: vira novo start
            setStartISO(iso)
            setEndISO(null)
        } else {
            setEndISO(iso)
        }
    }

    const quickSet = (kind: "today" | "tomorrow" | "next7") => {
        const base = new Date()
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())

        if (kind === "today") {
            setMode("single")
            setStartISO(toISODate(d))
            setEndISO(null)
            setCursorMonth(new Date(d.getFullYear(), d.getMonth(), 1))
            return
        }

        if (kind === "tomorrow") {
            d.setDate(d.getDate() + 1)
            setMode("single")
            setStartISO(toISODate(d))
            setEndISO(null)
            setCursorMonth(new Date(d.getFullYear(), d.getMonth(), 1))
            return
        }

        // next7
        const start = d
        const end = new Date(d)
        end.setDate(end.getDate() + 6)
        setMode("range")
        setStartISO(toISODate(start))
        setEndISO(toISODate(end))
        setCursorMonth(new Date(start.getFullYear(), start.getMonth(), 1))
    }

    const apply = () => {
        onApply({
            mode,
            startDate: startISO,
            endDate: mode === "range" ? endISO : null,
        })
        onClose()
    }

    const clear = () => {
        setStartISO(null)
        setEndISO(null)
        setMode("single")
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay leve (sem escurecer demais) */}
            <div className="absolute inset-0 bg-black/10" />

            <div
                ref={popRef}
                className="absolute w-[300px] max-w-[92vw] rounded-2xl border border-blue-100 bg-white shadow-2xl"
                style={{ top: pos.top, left: pos.left }}
            >
                {/* seta */}
                <div
                    className="absolute w-3 h-3 bg-white border-l border-t border-blue-100 rotate-45"
                    style={{ top: arrow.top, left: arrow.left }}
                />

                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-blue-50">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-blue-700">{title}</h3>
                            <p className="text-[12px] text-gray-500">
                                Selecione uma data{mode === "range" ? " ou um intervalo" : ""}.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="h-9 w-9 rounded-xl border border-blue-100 bg-white text-blue-700 hover:bg-blue-50 transition flex items-center justify-center"
                            aria-label="Fechar agenda"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Month controls */}
                <div className="px-4 pt-3">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() =>
                                setCursorMonth(
                                    new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() - 1, 1)
                                )
                            }
                            className="h-9 w-9 rounded-xl border border-blue-100 text-blue-700 hover:bg-blue-50 transition flex items-center justify-center"
                            aria-label="Mês anterior"
                        >
                            ‹
                        </button>

                        <div className="text-sm font-semibold text-gray-900 capitalize">
                            {monthLabel}
                        </div>

                        <button
                            onClick={() =>
                                setCursorMonth(
                                    new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 1)
                                )
                            }
                            className="h-9 w-9 rounded-xl border border-blue-100 text-blue-700 hover:bg-blue-50 transition flex items-center justify-center"
                            aria-label="Próximo mês"
                        >
                            ›
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="mt-3 grid grid-cols-7 gap-1">
                        {WEEKDAYS.map((w) => (
                            <div
                                key={w}
                                className="text-[11px] text-gray-500 font-medium text-center py-1"
                            >
                                {w}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="mt-1 grid grid-cols-7 gap-1 pb-3">
                        {daysGrid.map((cell, idx) => {
                            if (!cell.date || !cell.iso) {
                                return <div key={idx} className="h-8" />
                            }

                            const d = cell.date
                            const iso = cell.iso
                            const selectedStart = startISO === iso
                            const selectedEnd = endISO === iso
                            const inRange = mode === "range" ? isInRange(d) : false
                            const isToday = isSameDay(d, today)

                            const base =
                                "h-8 rounded-lg text-xs font-medium transition flex items-center justify-center"

                            const cls =
                                selectedStart || selectedEnd
                                    ? `${base} bg-blue-600 text-white`
                                    : inRange
                                        ? `${base} bg-blue-50 text-blue-700`
                                        : `${base} hover:bg-blue-50 text-gray-900`

                            return (
                                <button
                                    key={idx}
                                    onClick={() => onPickDay(iso)}
                                    className={cls}
                                    aria-label={`Selecionar ${iso}`}
                                >
                                    <span className={isToday && !(selectedStart || selectedEnd) ? "text-blue-700" : ""}>
                                        {d.getDate()}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-blue-50 flex items-center gap-2">
                    <button
                        onClick={clear}
                        className="px-3 py-2 rounded-xl text-sm font-medium border border-blue-100 text-blue-700 hover:bg-blue-50 transition"
                    >
                        Limpar
                    </button>

                    <div className="flex-1 text-[12px] text-gray-500 truncate">
                        {mode === "single" ? (
                            <>Selecionado: {startISO ?? "—"}</>
                        ) : (
                            <>Intervalo: {startISO ?? "—"} → {endISO ?? "—"}</>
                        )}
                    </div>

                    <button
                        onClick={apply}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    )
}

/*
======================
EXEMPLO DE USO (na sua página do filtro)
======================

"use client"
import { useRef, useState } from "react"
import AgendaFilterPopover, { AgendaFilterValue } from "@/components/AgendaFilterPopover"

export default function JobsPage() {
  const btnAgendaRef = useRef<HTMLButtonElement>(null)
  const [openAgenda, setOpenAgenda] = useState(false)

  const handleApply = (value: AgendaFilterValue) => {
    // aqui você usa value.startDate / value.endDate pra filtrar
    console.log(value)
  }

  return (
    <div>
      <button
        ref={btnAgendaRef}
        onClick={() => setOpenAgenda(true)}
        className="px-4 py-2 rounded-xl border border-blue-100 text-blue-700 hover:bg-blue-50"
      >
        Agenda
      </button>

      <AgendaFilterPopover
        open={openAgenda}
        anchorRef={btnAgendaRef}
        onClose={() => setOpenAgenda(false)}
        onApply={handleApply}
        title="Filtrar por agenda"
      />
    </div>
  )
}
*/