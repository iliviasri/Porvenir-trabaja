# Requisitos implementados y límites

Estado según el documento de especificación.

| Área | Estado | Notas |
|---|---|---|
| Roles trabajador / empresa / administrador (UI + servidor + RLS) | Implementado | RLS probada con 38 aserciones en PGlite |
| Bolsa de empleo completa | Implementado | Estados de postulación, favoritos, sin duplicados, moderación, bloqueo de ofertas engañosas |
| Prácticas vs empleo dependiente | Implementado | Tipos de oferta y avisos |
| IA FORMALIZA | Implementado | Reglas + catálogo versionado; IA solo redacta (requiere API key) |
| Seguimiento de negocio y documentos | Implementado | Estados registrado → documentación verificada, suspendido |
| MATCH LABORAL | Implementado | Determinista, pesos configurables |
| CV INTELIGENTE | Implementado | Voz requiere `TRANSCRIBE_*`; extracción requiere `LLM_*`; PDF local con pdf-lib |
| CUL | Implementado | Enlace oficial y guía |
| Chatbot | Implementado | Base de conocimiento administrable, fuentes con fecha, límite de uso |
| Directorio | Implementado | Solo negocios con `is_public` |
| Observatorio, CSV, auditoría | Implementado | Distingue registros internos de datos verificados externamente |
| Privacidad / ARCO | Implementado | Solicitudes, exportación JSON, eliminación por administración |

## No verificado en este entorno
- Ejecución real contra un proyecto Supabase y contra proveedores LLM/transcripción (se validaron SQL/RLS en Postgres embebido, lógica con pruebas unitarias y compilación completa).
- Pruebas end-to-end en navegador y auditoría de accesibilidad con lectores de pantalla.
- Pruebas de carga.
