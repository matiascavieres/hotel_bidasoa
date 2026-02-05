import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'inventario@hotelbidasoa.cl'

interface ProductItem {
  name: string
  code?: string
  quantity: number
  unit: string
  is_available?: boolean
}

interface EmailRequest {
  type:
    | 'request_created'
    | 'request_approved'
    | 'request_rejected'
    | 'request_delivered'
    | 'transfer_created'
    | 'transfer_completed'
    | 'low_stock_alert'
  recipients: string[]
  data: Record<string, unknown>
}

// Función para obtener timestamp formateado en Chile
function getFormattedTimestamp(): string {
  const now = new Date()
  // Formatear para Chile (UTC-3 o UTC-4 dependiendo del horario)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  return now.toLocaleString('es-CL', options)
}

// Estilos comunes para los emails
const styles = {
  container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',
  header: 'background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;',
  headerTitle: 'margin: 0; font-size: 24px;',
  headerSubtitle: 'margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;',
  body: 'background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;',
  infoBox: 'background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3b82f6;',
  infoGrid: 'display: table; width: 100%; border-collapse: separate; border-spacing: 10px 0;',
  infoCell: 'display: table-cell; text-align: center; padding: 10px; vertical-align: top;',
  infoLabel: 'color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;',
  infoValue: 'color: #1e293b; font-size: 15px; font-weight: 600;',
  timestamp: 'color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 15px;',
  table: 'width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden;',
  tableHeader: 'background: #059669; color: white; padding: 12px 15px; text-align: left; font-size: 14px;',
  tableHeaderRight: 'background: #059669; color: white; padding: 12px 15px; text-align: right; font-size: 14px;',
  tableCell: 'padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #334155;',
  tableCellRight: 'padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right;',
  tableCellCode: 'padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12px;',
  statusAvailable: 'background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px;',
  statusUnavailable: 'background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px;',
  footer: 'background: #1e293b; color: #94a3b8; padding: 15px 20px; border-radius: 0 0 8px 8px; font-size: 12px; text-align: center;',
  alert: 'background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 15px;',
  alertTitle: 'color: #dc2626; font-weight: 600; margin-bottom: 8px;',
}

// Función para generar la grilla de información centrada
function generateInfoGrid(items: Array<{ label: string; value: string }>): string {
  const cells = items.map(item => `
    <td style="${styles.infoCell}">
      <div style="${styles.infoLabel}">${item.label}</div>
      <div style="${styles.infoValue}">${item.value}</div>
    </td>
  `).join('')

  return `
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        ${cells}
      </tr>
    </table>
  `
}

// Función para generar tabla de productos
function generateProductTable(items: ProductItem[], showAvailability = false): string {
  if (!items || items.length === 0) return ''

  const rows = items.map(item => {
    const availabilityCell = showAvailability
      ? `<td style="${styles.tableCell}">
           <span style="${item.is_available !== false ? styles.statusAvailable : styles.statusUnavailable}">
             ${item.is_available !== false ? '✓ Disponible' : '✗ No disponible'}
           </span>
         </td>`
      : ''

    return `
      <tr>
        <td style="${styles.tableCell}">
          <div style="font-weight: 500;">${item.name}</div>
          ${item.code ? `<div style="color: #64748b; font-size: 12px;">Código: ${item.code}</div>` : ''}
        </td>
        <td style="${styles.tableCellRight}">${item.quantity} ${item.unit}</td>
        ${availabilityCell}
      </tr>
    `
  }).join('')

  return `
    <table style="${styles.table}">
      <thead>
        <tr>
          <th style="${styles.tableHeader}">Producto</th>
          <th style="${styles.tableHeaderRight}">Cantidad</th>
          ${showAvailability ? `<th style="${styles.tableHeader}">Estado</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

// Wrapper para el email completo
function wrapEmail(title: string, subtitle: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background: #f1f5f9;">
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.headerTitle}">${title}</h1>
          <p style="${styles.headerSubtitle}">${subtitle}</p>
        </div>
        <div style="${styles.body}">
          ${content}
        </div>
        <div style="${styles.footer}">
          <p style="margin: 0;">Sistema de Inventario - Hotel Bidasoa</p>
          <p style="margin: 5px 0 0 0;">Este es un correo automático, por favor no responder.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

const templates: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  request_created: (data) => {
    const items = (data.items as ProductItem[]) || []
    const itemsTable = generateProductTable(items)
    const timestamp = getFormattedTimestamp()

    const infoGrid = generateInfoGrid([
      { label: 'Solicitante', value: String(data.requester_name) },
      { label: 'Destino', value: String(data.location) },
      { label: 'Total Productos', value: `${data.items_count} items` },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.infoBox}">
        ${infoGrid}
      </div>
      ${data.notes ? `<div style="${styles.infoBox}"><div style="${styles.infoLabel}">Notas</div><div style="color: #334155;">${data.notes}</div></div>` : ''}
      ${itemsTable}
      <p style="margin-top: 20px; color: #64748b; text-align: center;">Ingresa al sistema para revisar y aprobar esta solicitud.</p>
    `
    return {
      subject: `📦 Nueva solicitud de ${data.requester_name} - ${data.location}`,
      html: wrapEmail('Nueva Solicitud', `Pedido para ${data.location}`, content),
    }
  },

  request_approved: (data) => {
    const items = (data.items as ProductItem[]) || []
    const itemsTable = generateProductTable(items, true)
    const timestamp = getFormattedTimestamp()

    const infoGrid = generateInfoGrid([
      { label: 'Aprobado por', value: String(data.approver_name) },
      { label: 'Destino', value: String(data.location) },
      { label: 'Productos', value: `${data.items_approved} de ${data.items_total}` },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.infoBox}">
        ${infoGrid}
      </div>
      ${itemsTable}
      <p style="margin-top: 20px; color: #64748b; text-align: center;">Pronto se realizará la entrega de los productos.</p>
    `
    return {
      subject: `✅ Solicitud aprobada - ${data.location}`,
      html: wrapEmail('Solicitud Aprobada', 'Tu pedido ha sido aprobado', content),
    }
  },

  request_rejected: (data) => {
    const timestamp = getFormattedTimestamp()

    const infoGrid = generateInfoGrid([
      { label: 'Rechazado por', value: String(data.approver_name) },
      { label: 'Ubicación', value: String(data.location) },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.alert}">
        <div style="${styles.alertTitle}">Solicitud Rechazada</div>
        <p style="margin: 0; color: #991b1b;">Tu solicitud de productos ha sido rechazada.</p>
      </div>
      <div style="${styles.infoBox}">
        ${infoGrid}
      </div>
      <p style="margin-top: 20px; color: #64748b; text-align: center;">Por favor contacta al bodeguero para más información.</p>
    `
    return {
      subject: `❌ Solicitud rechazada - ${data.location}`,
      html: wrapEmail('Solicitud Rechazada', 'Tu pedido no fue aprobado', content),
    }
  },

  request_delivered: (data) => {
    const items = (data.items as ProductItem[]) || []
    const itemsTable = generateProductTable(items)
    const timestamp = getFormattedTimestamp()

    const infoGrid = generateInfoGrid([
      { label: 'Entregado por', value: String(data.deliverer_name) },
      { label: 'Destino', value: String(data.location) },
      { label: 'Total', value: `${data.items_count} productos` },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.infoBox}">
        ${infoGrid}
      </div>
      ${itemsTable}
      <p style="margin-top: 20px; color: #059669; text-align: center; font-weight: 500;">✓ El inventario ha sido actualizado automáticamente.</p>
    `
    return {
      subject: `🚚 Solicitud entregada - ${data.location}`,
      html: wrapEmail('Entrega Completada', 'Los productos han sido entregados', content),
    }
  },

  transfer_created: (data) => {
    const items = (data.items as ProductItem[]) || []
    const itemsTable = generateProductTable(items)
    const timestamp = getFormattedTimestamp()

    const locationGrid = generateInfoGrid([
      { label: 'Origen', value: String(data.from_location) },
      { label: '→', value: '' },
      { label: 'Destino', value: String(data.to_location) },
    ])

    const detailsGrid = generateInfoGrid([
      { label: 'Creado por', value: String(data.creator_name) },
      { label: 'Total', value: `${data.items_count} productos` },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.infoBox}">
        ${locationGrid}
      </div>
      <div style="${styles.infoBox}">
        ${detailsGrid}
      </div>
      ${itemsTable}
      <p style="margin-top: 20px; color: #f59e0b; text-align: center; font-weight: 500;">⏳ Pendiente de confirmación de recepción.</p>
    `
    return {
      subject: `🔄 Nuevo traspaso: ${data.from_location} → ${data.to_location}`,
      html: wrapEmail('Nuevo Traspaso', `De ${data.from_location} a ${data.to_location}`, content),
    }
  },

  transfer_completed: (data) => {
    const items = (data.items as ProductItem[]) || []
    const itemsTable = generateProductTable(items)
    const timestamp = getFormattedTimestamp()

    const locationGrid = generateInfoGrid([
      { label: 'Origen', value: String(data.from_location) },
      { label: '→', value: '' },
      { label: 'Destino', value: String(data.to_location) },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.infoBox}">
        ${locationGrid}
      </div>
      <div style="${styles.infoBox}">
        <div style="text-align: center;">
          <div style="${styles.infoLabel}">Confirmado por</div>
          <div style="${styles.infoValue}">${data.confirmer_name}</div>
        </div>
      </div>
      ${itemsTable}
      <p style="margin-top: 20px; color: #059669; text-align: center; font-weight: 500;">✓ El inventario ha sido actualizado en ambas ubicaciones.</p>
    `
    return {
      subject: `✅ Traspaso completado: ${data.from_location} → ${data.to_location}`,
      html: wrapEmail('Traspaso Completado', 'La transferencia ha sido confirmada', content),
    }
  },

  low_stock_alert: (data) => {
    const timestamp = getFormattedTimestamp()

    const infoGrid = generateInfoGrid([
      { label: 'Producto', value: String(data.product_name) },
      { label: 'Ubicación', value: String(data.location) },
    ])

    const content = `
      <div style="${styles.timestamp}">📅 ${timestamp}</div>
      <div style="${styles.alert}">
        <div style="${styles.alertTitle}">⚠️ Alerta de Stock Bajo</div>
        <p style="margin: 0; color: #991b1b;">El siguiente producto requiere reabastecimiento urgente.</p>
      </div>
      <div style="${styles.infoBox}">
        ${infoGrid}
        <div style="text-align: center; margin-top: 5px; color: #64748b; font-size: 12px;">Código: ${data.product_code}</div>
      </div>
      <table style="${styles.table}">
        <tr>
          <td style="${styles.tableCell}"><strong>Stock actual</strong></td>
          <td style="${styles.tableCellRight}; color: #dc2626; font-weight: 600;">${data.current_stock} ml</td>
        </tr>
        <tr>
          <td style="${styles.tableCell}"><strong>Stock mínimo</strong></td>
          <td style="${styles.tableCellRight}">${data.min_stock} ml</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="${styles.tableCell}"><strong>Déficit</strong></td>
          <td style="${styles.tableCellRight}; color: #dc2626; font-weight: 600;">${data.deficit} ml</td>
        </tr>
      </table>
      <p style="margin-top: 20px; color: #dc2626; text-align: center; font-weight: 500;">Por favor realiza un reabastecimiento lo antes posible.</p>
    `
    return {
      subject: `🚨 ALERTA: Stock bajo - ${data.product_name}`,
      html: wrapEmail('Alerta de Stock', 'Reabastecimiento necesario', content),
    }
  },
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const { type, recipients, data }: EmailRequest = await req.json()

    if (!type || !recipients || recipients.length === 0) {
      throw new Error('Missing required fields: type, recipients')
    }

    const template = templates[type]
    if (!template) {
      throw new Error(`Unknown email type: ${type}`)
    }

    const { subject, html } = template(data)

    // Filter out test/fake emails - only send to real emails
    // With free Resend account using onboarding@resend.dev, only verified emails work
    const validRecipients = recipients.filter(email =>
      email &&
      !email.includes('@test.') &&
      !email.includes('@example.') &&
      email.includes('@')
    )

    if (validRecipients.length === 0) {
      console.log('No valid recipients after filtering, skipping email send')
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'No valid recipients' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    console.log('Sending email to:', validRecipients)

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: validRecipients,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const result = await response.json()

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
