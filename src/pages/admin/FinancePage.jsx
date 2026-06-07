import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// Formateur sans caractères unicode problématiques pour jsPDF
const fmtPDF = (n) => {
  const s = Math.round(n || 0).toString()
  const parts = []
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i))
  return parts.join(' ') + ' FCFA'
}

function FinancePage() {
  const now = new Date()
  const [year,      setYear]      = useState(now.getFullYear())
  const [month,     setMonth]     = useState(now.getMonth())
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [stats,     setStats]     = useState({ revenueMonth: 0, revenueYear: 0, activeSubs: 0, expiringSoon: 0 })
  const [activeSubs,     setActiveSubs]     = useState([])
  const [recentPayments, setRecentPayments] = useState([])

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd   = new Date(year, month + 1, 0).toISOString().split('T')[0]
  const yearStart  = `${year}-01-01`
  const todayStr   = now.toISOString().split('T')[0]
  const in30Days   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  useEffect(() => { loadAll() }, [year, month])

  const loadAll = async () => {
    setLoading(true)
    const [monthBorrow, yearBorrow, yearSub, activeSubsRes, expiringRes, recentBorrow] = await Promise.all([
      supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', monthStart).lte('created_at', monthEnd),
      supabase.from('borrowings').select('amount_paid').eq('loan_type', 'location').gte('created_at', yearStart),
      supabase.from('subscriptions').select('amount_paid').eq('status', 'active').gte('created_at', yearStart),
      supabase.from('subscriptions').select('*, profiles(full_name, phone)').eq('status', 'active').order('end_date'),
      supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active').lte('end_date', in30Days).gte('end_date', todayStr),
      supabase.from('borrowings').select('*, profiles(full_name), books(title)').eq('loan_type', 'location').gt('amount_paid', 0).gte('created_at', monthStart).lte('created_at', monthEnd).order('created_at', { ascending: false }).limit(20),
    ])
    const revenueMonth = monthBorrow.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
    const revenueYearB = yearBorrow.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
    const revenueYearS = yearSub.data?.reduce((s, b) => s + (b.amount_paid || 0), 0) || 0
    setStats({ revenueMonth, revenueYear: revenueYearB + revenueYearS, activeSubs: activeSubsRes.data?.length || 0, expiringSoon: expiringRes.count || 0 })
    setActiveSubs(activeSubsRes.data || [])
    setRecentPayments(recentBorrow.data || [])
    setLoading(false)
  }

  const handleExportPDF = async () => {
    setExporting(true)
    const doc = new jsPDF()
    const GREEN = [21, 128, 61]
    const LIGHT = [240, 253, 244]

    // En-tete
    doc.setFillColor(...GREEN)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Bibliotheque-navs CI', 14, 14)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Etat financier - ${MONTHS[month]} ${year}`, 14, 24)
    doc.text(`Genere le ${now.toLocaleDateString('fr-FR')}`, 14, 31)

    // Résumé
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Resume du mois', 14, 48)

    const summaryData = [
      ['Revenus locations', fmtPDF(stats.revenueMonth)],
      ['Abonnements actifs', String(stats.activeSubs)],
      ['Expirent dans 30 jours', String(stats.expiringSoon)],
      [`Total revenus ${year}`, fmtPDF(stats.revenueYear)],
    ]

    autoTable(doc, {
      startY: 52,
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { cellWidth: 80, halign: 'right' } },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT },
    })

    // Paiements du mois
    const afterSummaryY = doc.lastAutoTable.finalY + 12
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Paiements de location - ${MONTHS[month]} ${year}`, 14, afterSummaryY)

    if (recentPayments.length > 0) {
      autoTable(doc, {
        startY: afterSummaryY + 4,
        head: [['Date', 'Membre', 'Livre', 'Montant (FCFA)']],
        body: recentPayments.map(p => [
          new Date(p.borrowed_at).toLocaleDateString('fr-FR'),
          p.profiles?.full_name || '-',
          p.books?.title || '-',
          fmtPDF(p.amount_paid || 0).replace(' FCFA', ''),
        ]),
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        styles: { fontSize: 9 },
        foot: [['', '', 'Total', fmtPDF(stats.revenueMonth)]],
        footStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
      })
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Aucun paiement enregistre ce mois-ci.', 14, afterSummaryY + 10)
      doc.setTextColor(0, 0, 0)
    }

    // Abonnements actifs — sur nouvelle page si besoin
    const afterPaymentsY = (doc.lastAutoTable?.finalY || afterSummaryY + 15) + 12
    if (activeSubs.length > 0) {
      // Nouvelle page si on manque de place
      if (afterPaymentsY > 220) doc.addPage()
      const subsY = afterPaymentsY > 220 ? 20 : afterPaymentsY

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Abonnements actifs', 14, subsY)

      autoTable(doc, {
        startY: subsY + 4,
        head: [['Membre', 'Debut', 'Fin', 'Montant (FCFA)']],
        body: activeSubs.map(s => [
          s.profiles?.full_name || '-',
          new Date(s.start_date).toLocaleDateString('fr-FR'),
          new Date(s.end_date).toLocaleDateString('fr-FR'),
          fmtPDF(s.amount_paid || 0).replace(' FCFA', ''),
        ]),
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        styles: { fontSize: 9 },
      })
    }

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text("Bibliotheque-navs CI - Les Navigateurs de Cote d'Ivoire", 14, 290)
      doc.text(`Page ${i}/${pageCount}`, 190, 290, { align: 'right' })
    }

    doc.save(`etat-financier-${year}-${String(month + 1).padStart(2, '0')}.pdf`)
    setExporting(false)
  }

  const fmt   = (n) => (n || 0).toLocaleString('fr-FR') + ' FCFA'
  const fdate = (d) => new Date(d).toLocaleDateString('fr-FR')
  const daysLeft = (endDate) => Math.ceil((new Date(endDate) - now) / (1000 * 60 * 60 * 24))

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
          <p className="text-slate-400 text-sm mt-1">Revenus et abonnements</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="border border-slate-200 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="border border-slate-200 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportPDF} disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            {exporting ? 'Generation...' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-teal-700 opacity-70 mb-2">Revenus {MONTHS[month]}</p>
          <p className="text-2xl font-bold text-teal-800">{loading ? '-' : fmt(stats.revenueMonth)}</p>
          <p className="text-xs text-teal-600 opacity-50 mt-1">Locations uniquement</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-teal-700 opacity-70 mb-2">Revenus {year}</p>
          <p className="text-2xl font-bold text-teal-800">{loading ? '-' : fmt(stats.revenueYear)}</p>
          <p className="text-xs text-teal-600 opacity-50 mt-1">Locations + abonnements</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-amber-700 opacity-70 mb-2">Abonnements actifs</p>
          <p className="text-2xl font-bold text-amber-800">{loading ? '-' : stats.activeSubs}</p>
        </div>
        <div className={`border rounded-2xl p-5 ${stats.expiringSoon > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
          <p className={`text-xs font-medium mb-2 ${stats.expiringSoon > 0 ? 'text-red-600' : 'text-slate-500'}`}>Expirent dans 30j</p>
          <p className={`text-2xl font-bold ${stats.expiringSoon > 0 ? 'text-red-700' : 'text-slate-700'}`}>{loading ? '-' : stats.expiringSoon}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">Abonnements actifs</h2>
          {activeSubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400"><p className="text-sm">Aucun abonnement actif</p></div>
          ) : (
            <div className="space-y-3">
              {activeSubs.map(sub => {
                const days = daysLeft(sub.end_date)
                const urgent = days <= 30; const expired = days < 0
                return (
                  <div key={sub.id} className={`bg-white rounded-xl border shadow-sm p-4 ${expired ? 'border-red-200' : urgent ? 'border-amber-200' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{sub.profiles?.full_name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{sub.profiles?.phone}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{fdate(sub.start_date)} - {fdate(sub.end_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-700">{(sub.amount_paid||0).toLocaleString('fr-FR')} F</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expired ? 'bg-red-100 text-red-600' : urgent ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                          {expired ? 'Expire' : urgent ? `${days}j restants` : 'Actif'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">Paiements — {MONTHS[month]}</h2>
          {recentPayments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400"><p className="text-sm">Aucun paiement ce mois</p></div>
          ) : (
            <div className="space-y-2">
              {recentPayments.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{b.books?.title}</p>
                    <p className="text-slate-400 text-xs">{b.profiles?.full_name}</p>
                    <p className="text-slate-300 text-xs">{fdate(b.borrowed_at)}</p>
                  </div>
                  <p className="text-sm font-bold text-teal-700 flex-shrink-0 ml-3">{(b.amount_paid||0).toLocaleString('fr-FR')} F</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default FinancePage
