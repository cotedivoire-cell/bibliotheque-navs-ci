import { useState } from 'react'

/**
 * BookCard v4 — couverture 100% confinée via styles inline
 * aspectRatio natif + overflow hidden sur le même élément
 * Aucune dépendance à paddingTop trick
 */
function BookCard({ book, onClick }) {
  const [imgError, setImgError] = useState(false)
  const available = book.available_copies > 0
  const hasCover  = book.cover_url && !imgError
  const initials  = book.title?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

  return (
    <button onClick={() => onClick(book)} className="group text-left w-full focus:outline-none">

      {/* Carte — overflow hidden global */}
      <div style={{
        background:  '#ffffff',
        border:      '1px solid #f3f4f6',
        boxShadow:   '0 1px 3px rgba(0,0,0,0.08)',
        overflow:    'hidden',
        transition:  'box-shadow 0.3s, transform 0.3s',
      }}
        className="group-hover:shadow-lg group-hover:-translate-y-0.5"
      >

        {/* ── Couverture — aspectRatio natif, overflow hidden strict ── */}
        <div style={{
          width:       '100%',
          aspectRatio: '2 / 3',
          overflow:    'hidden',   /* clip natif, pas de padding trick */
          position:    'relative',
          background:  '#f9fafb',
          display:     'block',
        }}>

          {hasCover ? (
            <img
              src={book.cover_url}
              alt={book.title}
              onError={() => setImgError(true)}
              style={{
                width:          '100%',
                height:         '100%',
                objectFit:      'cover',
                objectPosition: 'center top',
                display:        'block',
                maxWidth:       '100%',
                maxHeight:      '100%',  /* empêche tout débordement vertical */
              }}
            />
          ) : (
            /* Couverture de repli Navigateurs CI */
            <div style={{
              width:          '100%',
              height:         '100%',
              background:     'linear-gradient(145deg, #052e16 0%, #15803d 60%, #065f46 100%)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '8px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                {initials}
              </span>
              <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase' }}>
                Navigateurs CI
              </span>
            </div>
          )}

          {/* Badge disponibilité */}
          <div style={{
            position:       'absolute',
            top:            '8px',
            right:          '8px',
            display:        'flex',
            alignItems:     'center',
            gap:            '5px',
            background:     available ? 'rgba(255,255,255,0.88)' : 'rgba(243,244,246,0.92)',
            backdropFilter: 'blur(4px)',
            padding:        '3px 8px',
            borderRadius:   '999px',
            boxShadow:      '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {available ? (
              <>
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                <span style={{ color: '#15803d', fontSize: '11px', fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1 }}>
                  Disponible
                </span>
              </>
            ) : (
              <span style={{ color: '#6b7280', fontSize: '11px', fontWeight: 500 }}>Indisponible</span>
            )}
          </div>

          {/* Overlay indisponible */}
          {!available && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.35)' }} />
          )}
        </div>

        {/* ── Zone texte uniforme ── */}
        <div style={{ padding: '12px', minHeight: '96px' }}>

          {/* Titre 2 lignes max — inline styles pour line-clamp cross-browser */}
          <h3 style={{
            fontSize:           '14px',
            fontWeight:         600,
            color:              '#111827',
            lineHeight:         1.4,
            margin:             0,
            display:            '-webkit-box',
            WebkitLineClamp:    2,
            WebkitBoxOrient:    'vertical',
            overflow:           'hidden',
          }}>
            {book.title}
          </h3>

          {/* Auteur */}
          <p style={{
            fontSize:     '12px',
            color:        '#9ca3af',
            marginTop:    '4px',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {book.author}
          </p>

          {/* Badge catégorie */}
          {book.categories?.name && (
            <span style={{
              display:      'inline-block',
              marginTop:    '8px',
              background:   '#f0fdf4',
              color:        '#15803d',
              fontSize:     '11px',
              padding:      '2px 10px',
              borderRadius: '999px',
              fontWeight:   500,
            }}>
              {book.categories.name}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default BookCard
