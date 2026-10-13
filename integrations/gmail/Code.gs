/**
 * Manda a Finanzas App los mails de facturas y pagos.
 * Se pega en Google Apps Script (script.google.com), dentro de TU cuenta de Google.
 *
 * Propiedades del script (Configuración del proyecto > Propiedades del script):
 *   APP_URL       dirección de tu app, con /api/ingest/mail al final
 *   INGEST_TOKEN  la clave que creaste en Más > Conexión con tus mails
 *   EXTRA_SENDERS (opcional) más remitentes separados por coma, ej. "banco.com.ar,otro.com"
 */

var SENDERS = ['aysadigital.com.ar', 'edenor.com', 'mercadopago.com', 'buenosaires.gob.ar'];
var LABEL = 'finanzas-enviado';
var MAX_PDF_BYTES = 2500000;

function sync() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('APP_URL');
  var token = props.getProperty('INGEST_TOKEN');
  if (!url || !token) throw new Error('Faltan APP_URL o INGEST_TOKEN en las propiedades del script.');

  var extra = (props.getProperty('EXTRA_SENDERS') || '').split(',').map(function (s) { return s.trim(); }).filter(String);
  var senders = SENDERS.concat(extra);
  var query =
    '(' + senders.map(function (s) { return 'from:' + s; }).join(' OR ') + ' OR subject:expensas) ' +
    'newer_than:10d -label:' + LABEL;

  var label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  var threads = GmailApp.search(query, 0, 20);

  threads.forEach(function (thread) {
    var allOk = true;
    thread.getMessages().forEach(function (msg) {
      var pdfs = [];
      var bytes = 0;
      msg.getAttachments().forEach(function (att) {
        if (att.getContentType() === 'application/pdf' && bytes + att.getSize() <= MAX_PDF_BYTES) {
          bytes += att.getSize();
          pdfs.push({ name: att.getName(), mimeType: 'application/pdf', base64: Utilities.base64Encode(att.getBytes()) });
        }
      });

      var res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true,
        payload: JSON.stringify({
          messageId: msg.getId(),
          from: msg.getFrom(),
          subject: msg.getSubject(),
          date: msg.getDate().toISOString(),
          body: msg.getPlainBody().slice(0, 15000),
          attachments: pdfs,
        }),
      });
      if (res.getResponseCode() !== 200) {
        allOk = false;
        console.error('Fallo ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
      }
    });
    // Solo se marca como enviado si salió todo bien: si falló, se reintenta en la próxima corrida.
    if (allOk) thread.addLabel(label);
  });
}
