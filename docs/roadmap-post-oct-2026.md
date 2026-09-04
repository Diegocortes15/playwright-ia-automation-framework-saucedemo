# Roadmap post-octubre 2026 — Framework Playwright IA

Este documento consolida las decisiones y el plan de trabajo acordado
para retomar el framework después de la pausa de formación (deadline
DataCamp track: octubre 2026).

Es el "handoff a mi yo del futuro". Si vuelvo después de otra pausa
larga, leer este archivo antes de tocar código.

---

## Contexto rápido

- **Framework**: Playwright + TypeScript + Claude Code Skills
- **Tesis arquitectónica**: authoring con IA, runtime determinista
- **Skills actuales** (`.claude/skills/`): /refine-ticket, /from-issue,
  /scaffold-page-object, /playwright-cli
- **Integraciones**: Atlassian MCP (Jira), GitHub CLI, Qase TCMS (con
  seam swappable en `src/tcms/qase-client.ts`)
- **CI dual**: PRs corren solo specs cambiados + typecheck/lint gate;
  merges corren suite completa + sync catalog a Qase

---

## Principios NO NEGOCIABLES

Aplican a todo trabajo sobre este framework. Cualquier propuesta que
los viole debe justificarse explícitamente.

### 1. YAGNI (You Aren't Gonna Need It)

No extraer abstracciones sin segundo consumidor real.

Ejemplos concretos ya decididos:

- NO crear `/create-pr` como skill separada hasta que `/investigate-bug`
  también lo necesite
- NO construir MCP server del framework antes de tener necesidad real
  de consumo externo (dashboards web, bots externos, etc.)
- NO crear `/fix-pr` hasta que agent metrics muestren >40% de PRs
  con cambios predecibles del reviewer

### 2. Humano en el loop permanente

IA propone, humano decide. NO auto-healing agents que "arreglen los
problemas que la IA creó". La IA NUNCA decide sola "voy a arreglar
esto y re-abrir el PR".

### 3. Authoring vs runtime

La IA solo autoriza; runtime siempre determinista.
Preferir scripts sobre instrucciones dentro de skills.

### 4. Disciplina de ADRs

ADRs SOLO cuando cambia una decisión arquitectónica.

Regla mental: "¿un nuevo dev en 6 meses necesitaría esto para
entender por qué el código está así?"

Framework maduro tiene 10-20 ADRs en toda su vida, no cientos.

Al revertir una decisión: NUEVO ADR + marcar el anterior como
"Superseded by ADR-XXXX". NUNCA editar ADR existente.

### 5. Antipatrones a NO caer

- NO subagent que corra tests de Playwright (necesitamos output
  completo cuando fallan: stack, screenshots, logs)
- NO sequential pipelines de subagents (información se pierde en
  handoffs). Bug fixing NO debe ser reproducir→debuggear→arreglar
  como 3 subagents
- NO "expert personas" en subagents ("you are a Python expert")
- NO SDD full-blown por ticket (proposal.md + spec.md + design.md
  - tasks.md). Es teatro burocrático para tests UI. El equivalente
    ya existe: Jira ticket + AC + Page Object + tests atómicos
- NO adoptar OpenSpec/Kiro/Spec Kit como herramientas. Duplicaría
  el harness propio. Tomar IDEAS (EARS, deltas, constitución), no
  herramientas
- NO sistema completo tasks.md/progress.md. Jira YA es el progress log
- NO multi-agent orchestrator formal. Overkill para la escala

### 6. Refactors grandes

Primero proponer y esperar aprobación. No cambiar decisiones ya
tomadas sin nueva evidencia (hay ADRs por algo).

---

## Decisiones de arranque (sesión 2026-09-04)

Tomadas tras ejecutar la Fase 1. Sobrescriben lo que diga el plan
original más abajo donde haya conflicto.

1. **Orden**: Bloque A completo primero; el fix del PR rojo va después
   del Bloque A (se leyó "antes que cualquier skill nueva" como "antes
   del Bloque D", no antes del A).
2. **PR rojo (hallazgo crítico de Fase 1.3)**: `/from-issue` hoy abre
   el PR igual con tests en rojo, y es diseño documentado
   ("PR-as-review-gate", workflow Steps 9 y 10). Se revierte a:
   reintento acotado 2-3x **durante el authoring** → si sigue fallando,
   reporte al usuario **sin abrir PR**, con cada intento logueado.
   El reintento pre-PR se considera authoring, no auto-healing, así que
   no viola el principio #2. **Requiere ADR nuevo** que supersede el
   contrato actual — no editar `workflow.md` sin él.
3. **`/playwright-cli` en el gate de skill-audit**: entra al audit, pero
   sus findings son **informativos y no fallan el build**. Es vendored
   (se regenera con `npx playwright-cli install --skills`), así que
   cualquier fix sobre ella se pierde en el próximo bump.
4. **Steps sin trigger**: B8, B12 y D18 quedan CERRADOS (ver anotaciones
   inline). Se abre item nuevo B12b por el gap real de `scripts/`.
5. **Bloque A steps 5-7 (skill-audit + pre-commit hook + gate en CI):
   DESCARTADOS.** Ver la anotación inline en el Bloque A para la evidencia.
   `skill-validator` queda como comando manual pre-handoff.
6. **PR rojo: RESUELTO** (ADR-0020, 2026-09-04). `/from-issue` ya no abre
   PRs rojos. Loop de 3 intentos de arreglo durante el authoring, con
   diagnóstico previo obligatorio de si el error es del código generado o
   **de la app** — en el segundo caso para y reporta, porque el test
   encontró un bug y "arreglarlo" lo borraría. Lista dura de arreglos
   prohibidos (borrar/skipear tests, debilitar aserciones, cambiar el valor
   esperado por el que emitió la app). Si no llega a verde: sin rama, sin
   commit, sin push, sin PR, sin artefacto TCMS. ADR-0020 scopea ADR-0012:
   el review gate sigue absorbiendo _juicio_, ya no _artefactos rotos_.
7. **Observaciones de runtime: HECHO** (ADR-0021, 2026-09-04). Ítem NUEVO,
   fuera del plan original, pedido por el user. Fixture auto-use que graba
   errores de consola, page errors, respuestas 4xx/5xx y diálogos; reporter
   que deduplica por firma y escribe `.observations/<feature>.json`. Nada se
   filtra — incluida la telemetría de terceros, que en una app real suele ser
   justo lo que explica una falla; el volumen se controla deduplicando y
   contando, no descartando. Triage humano vía `status` + `note`. Slack recibe
   un **conteo**, nunca el contenido. CI sube el artifact y no commitea, para
   que las corridas agendadas no ensucien `main`.

   **La primera corrida encontró algo real**: cada navegación de la app
   devuelve **HTTP 404** (saucedemo está en GitHub Pages con el shim
   `spa-github-pages`) y la app renderiza igual por routing de cliente.
   50 tests en verde y nadie se enteraba. Corrige lo que yo había afirmado:
   que en saucedemo esto no iba a encontrar nada real.

8. **B12b arrancado**: primer script extraído,
   `from-issue/scripts/typecheck-spec.sh` (Step 9). Al escribirlo apareció
   un bug latente que la prosa escondía: el workflow decía `npx tsc`, y sin
   `node_modules` npx baja **`tsc@2.0.4`** del registry — un paquete squatter
   deprecado que no es el compilador. El skill podía registrar
   "Typecheck ✅ PASS" sin haber typechequeado nada. El script resuelve `tsc`
   solo desde `node_modules/.bin` y falla con exit 69 si no está.
   Es la mejor evidencia del principio #3 que apareció hasta ahora.
9. **Portabilidad de skills: HECHO** (ADR-0019, 2026-09-04). Las skills
   pasan a ser artefactos portables — objetivo explícito, porque la idea
   del framework es que alguien se lleve los andamios para arrancar
   automation de otra app. Se convirtieron **56 links** que escapaban del
   directorio de su skill: citas de ADR a texto plano, paths del repo a
   prosa con backticks, cross-skill a prosa (sin duplicar), e invocación
   de skills por nombre. Las 4 skills quedan en verde con `skill-validator`.
   De paso desaparecieron 4 links rotos en `pr-description-template.md`.

### Hallazgos de Fase 1 pendientes de arreglar (triviales)

- ~~`CLAUDE.md` línea 42: mirror a Qase "at PR time"~~ — **CORREGIDO
  (2026-09-04)**: ahora describe el artefacto `.tcms/records/` + sync a
  merge, citando ADR-0016 y ADR-0017.
- ~~`docs/adr/0016-tcms-mirror.md` no tiene línea `Status:`~~ — falso:
  sí la tiene (`**Status:**`); el grep original era case-sensitive sobre
  `^status`. Nada que arreglar.
- Node 22 no está pineado: sin `.nvmrc` ni `engines` en `package.json`.

### Estado del entorno al arrancar

- Sin `uv` / `uvx` / `pipx` (Python 3.12.2 y `gh` 2.97.0 sí están).
- MCP de Atlassian **sin autorizar** — hasta conectarlo por OAuth desde
  una sesión interactiva (`/mcp`) no hay prueba end-to-end de
  `/from-issue` ni `/refine-ticket`.

---

## Fase 1 — Reconocimiento con ojos frescos

**Objetivo**: entender el estado real del repo hoy antes de tocar
nada. SOLO LECTURA.

### 1.1 CLAUDE.md

- Cuántas líneas tiene
- Si pasa las ~200-300 líneas, marcar qué reglas probablemente solo
  aplican en el 20% de casos (candidatas a moverse a `references/`
  de skills)
- **Sospecha específica a verificar**: reglas detalladas sobre
  TCMS/Qase probablemente solo aplican cuando `/from-issue` toca
  TCMS → candidatas a moverse a `from-issue/references/tcms-mapping.md`
- Regla mental: si CLAUDE.md pasa ~200-300 líneas, el ejercicio
  de mayor ROI para eficiencia de contexto es identificar qué
  mover a skills

### 1.2 Las 4 skills en `.claude/skills/`

Para cada una (/refine-ticket, /from-issue, /scaffold-page-object,
/playwright-cli) reportar:

- Longitud del SKILL.md (líneas)
- Si el frontmatter tiene `allowed-tools` declarado
- Si el frontmatter tiene `model` declarado
- Si la `description` incluye 2-3 variaciones de cómo un usuario real
  pediría la tarea (o solo la canónica)
- Si hay carpeta `references/` o `scripts/` ya
- Si hay sección tipo "when to delegate to another skill"

### 1.3 Verificaciones específicas en `/from-issue/SKILL.md`

Estas verificaciones cambian decisiones downstream. Hacerlas todas:

- ¿Menciona "augment", "enrich", "context", "cross-reference" o
  "existing tests"? (buscar literalmente)
  - Si SÍ hace augment internamente: refuerza extraer `/find-tests`
    como refactor legítimo, y reduce valor de `/plan-ticket` separada
  - Si NO lo hace: ambas skills mantienen justificación independiente
- ¿Bloquea la creación del PR si los tests locales fallan?
  - **CRÍTICO**: si NO lo hace, es fix de MÁXIMA prioridad, antes
    que cualquier skill nueva. Un `/from-issue` "exitoso" nunca
    debe producir PR rojo. La skill debe intentar arreglar 2-3
    veces, y si sigue fallando reportar al usuario SIN abrir PR
- ¿Menciona la creación de ADRs? (buscar "ADR" o "docs/adr")
- ¿Qué otras responsabilidades no-core se colaron ahí? (candidatas
  a extraer)

### 1.4 ADRs en `docs/adr/`

- Cuántos hay en total
- Últimas fechas de commits
- ¿Parecen escritos manualmente o generados por alguna skill?
- Verificaciones adicionales sobre quién los crea:
  1. Buscar "ADR" o "docs/adr" en `.claude/skills/from-issue/SKILL.md`
  2. Revisar últimos commits en `docs/adr/` (¿son manuales o
     automatizados por PR de from-issue?)
  3. Revisar si CLAUDE.md instruye a crear ADRs
- Apuesta 80/20: los crea el user manualmente con Claude ayudando
  en Cursor chat, NO vía /from-issue
- Buscar ADR-0004 específicamente (cross-browser diferido)

### 1.5 README.md

- ¿Tiene TL;DR de 3-4 bullets arriba (antes de la imagen hero)?
- ¿Tiene GIF/screencast del flujo `/from-issue`?
- ¿Tiene sección "Failure modes & mitigations"?
- ¿Muestra métricas del agente (ej. % de PRs generados por
  `/from-issue` que pasan review sin cambios)?
- ¿Tiene párrafo "why Skills instead of MCP server"?
- ¿El diagrama Mermaid renderiza bien en GitHub y móvil?

### 1.6 Estado del repo

- Última fecha de commit
- Rama actual y si hay cambios sin commitear
- Node version del package.json vs Node 22 esperado
- Playwright version del package.json vs 1.59 esperado
- ¿Existe AGENTS.md ya?
- ¿Existe carpeta `.claude/agents/`? (para subagents custom)
- ¿Existen hooks configurados? (buscar `.claude/hooks/` o config
  equivalente)

### Después de Fase 1

Pausar y revisar hallazgos antes de arrancar Fase 2. Si algo
detectado contradice el plan, mencionarlo explícitamente.

---

## Fase 2 — Plan de trabajo priorizado

Bloques secuenciales dentro de cada uno. El bloque E puede ir en
paralelo cuando se apruebe explícitamente.

### Bloque A — Piso base de skills (obligatorio, en orden)

1. Instalar `skills validator` (agent skills verifier command,
   vía `uv` → investigar comando exacto al arranque) y correr
   sobre las 4 skills
2. Correr `claude --debug` en el repo para detectar errores
   silenciosos de carga
3. Auditar descriptions con foco en variaciones reales de cómo se
   pediría cada skill (testear con 3-4 variaciones cada una)
4. Agregar `allowed-tools` a:
   - `/playwright-cli` → Read/Grep/Glob/Bash únicamente
   - `/refine-ticket` → solo Jira MCP, no debería tocar repo

   > **REVISADO (2026-09-04)** — las 4 skills **ya declaran**
   > `allowed-tools`. Aplicar este step literal sería contraproducente:
   > `/refine-ticket` ya es `Read Glob Grep` + MCP Atlassian (sin `Write`
   > ni `Bash`, o sea que no puede escribir en el repo), y **necesita**
   > leer el repo porque su rubric está "grounded in existing
   > automation"; sacarle Read/Glob/Grep la rompe. `/playwright-cli` hoy
   > es `Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)` — el step pedía
   > agregarle Read/Grep/Glob, lo que **amplía** en vez de restringir.
   > El step se reduce a: revisar caso por caso, no ampliar por defecto.

5. Correr `skill-audit` de dabit3 (https://github.com/dabit3/skill-audit)
   baseline sobre las 4 skills y arreglar findings Critical+High
6. Activar pre-commit hook local con `skill-audit`
7. Activar gate en GitHub Actions CI con umbrales escalonados:
   - Critical+High → fail siempre desde día 1
   - Medium → warn 2-3 semanas, luego fail
   - Low → informativo permanente
   - Path filter: solo dispara en cambios a `.claude/skills/**`
   - Documentar el gate en CONTRIBUTING.md o CLAUDE.md
   - **`/playwright-cli` es vendored** (se regenera con
     `npx playwright-cli install --skills`): entra al audit pero sus
     findings son **informativos, nunca fallan el build**. Documentar
     la excepción junto al gate.

> **STEPS 5-7 CERRADOS / DESCARTADOS (2026-09-04)** — no pagan a esta escala.
> Evidencia: se evaluaron las dos herramientas sobre ~4.200 líneas de skills.
> Hallazgos reales: **4 links relativos rotos**, todos encontrables con `grep`.
> Cero de seguridad, cero de corrección. El resto fue ruido (`"password123"`
> en un ejemplo marcado como credencial) o sugerencias que contradicen
> ADR-0008 ("agregá una sección `## Usage`").
>
> - **`skill-audit` (dabit3): descartado.** No lee `references/` (`readdirSync`
>   no recursivo) → auditaba 516 de 4.177 líneas, el **12,4%**. Además
>   concatena `SKILL.md` consigo mismo, así que duplica cada finding con
>   números de línea fantasma. Sin publicar en npm, un solo commit de
>   feb-2026, hay que compilarlo desde el fuente.
> - **`skill-validator` (agent-ecosystem): se queda, pero como comando
>   manual, no como gate.** Sí lee `references/`, valida links y frontmatter,
>   detecta huérfanos y **contabiliza tokens**. Documentado en CLAUDE.md.
>
> Un gate en CI para 4 archivos que cambian dos veces al año, en un repo de
> un solo autor, es teatro de compliance. Para un cliente el valor está en
> las agent metrics (item 22) y en "Failure modes" (item 21), no en un
> linter de markdown.

> **Presupuesto de tokens medido (2026-09-04)** — la métrica que sí sirve,
> y la prueba dura de que ADR-0008 funciona:
>
> | Skill                | `SKILL.md` (siempre en contexto) | Total con `references/` |
> | -------------------- | -------------------------------- | ----------------------- |
> | from-issue           | 808                              | 23.562                  |
> | playwright-cli       | 2.623                            | 13.704                  |
> | scaffold-page-object | 346                              | 4.149                   |
> | refine-ticket        | 635                              | 3.969                   |
> | **Total**            | **4.412**                        | **45.384**              |
>
> 4.412 tokens cargan siempre; 41.000 cargan bajo demanda.

### Bloque B — Mejoras de contenido a skills

8. Si `/from-issue/SKILL.md` pasa las 500 líneas: factorizar a
   `from-issue/references/` (pr-body-template.md, assumptions-rubric.md,
   ac-coverage-mapping.md, composition-rules.md) y
   `from-issue/scripts/` (preflight.sh, generate-pr-body.sh)

   > **CERRADO (2026-09-04)** — no hay trigger: `from-issue/SKILL.md`
   > tiene **51 líneas**, no 500. El patrón ADR-0008/0009 (SKILL.md
   > compacto + `references/` verboso) ya está aplicado en las 4 skills,
   > y los archivos propuestos ya existen con otros nombres
   > (`pr-description-template.md`, `qa-analysis.md`, etc.). Lo único
   > real que faltaba de este step eran los `scripts/` → ver B12b.

9. **Adoptar EARS notation en `/refine-ticket`** — que los
   acceptance criteria salgan como
   "WHEN [condition/event] THE SYSTEM SHALL [expected behavior]".
   Se convierten casi 1:1 en `test('...', ...)`.
   Este es el cambio de mayor ROI/menor esfuerzo del bloque.
10. Formalizar Given/When/Then como estructura obligatoria en el
    template de specs Playwright que usa `/from-issue`
11. Consolidar `AGENTS.md` como constitución del proyecto:
    - Stack: Node 22, TS 5.9 strict, Playwright 1.59
    - Convenciones: Page Object strict, fixtures, role-tag routing
      (@no-auth, @standard, @problem, @all-users, @smoke),
      composición tests→pages→components→locators
    - Reglas prohibidas: no xpath, no waitForTimeout, no `.only()`
      sin razón, no `console.log`, no adjetivos ambiguos ("robust",
      "fast", "friendly")
    - Patrón EARS obligatorio para AC
12. Auditar CLAUDE.md contra AGENTS.md — mover a `references/` lo
    que no aplique en 80% de conversaciones

    > **CERRADO (2026-09-04)** — sin candidatos: `CLAUDE.md` tiene
    > **133 líneas**, muy por debajo del umbral de 200-300. La sospecha
    > sobre TCMS/Qase resultó falsa: solo 3 líneas lo mencionan y las
    > tres son punteros; el detalle de mapping ya vive en
    > `from-issue/references/tcms-sync.md`. Por YAGNI, no se mueve nada.
    > Lo único real que apareció en CLAUDE.md fue la deriva de la línea
    > 42 contra ADR-0017 — fix de una línea, no un refactor de contexto.

12b. **Extraer `scripts/` en las skills propias** (item nuevo, abierto
2026-09-04). Fase 1 encontró **cero carpetas `scripts/` en las 4
skills**: todo es instrucción en prosa. Es el gap más grande contra
el principio #3 ("preferir scripts sobre instrucciones dentro de
skills"). Candidatos con determinismo real, en orden de ROI:
el typecheck aislado (`.tsconfig.scratch.json` de workflow Step 9),
el preflight de branch/base (Step 1.5) y el render del PR body
(Step 12). Aplicar YAGNI por candidato: extraer solo lo que ya se
repite, no los tres de una.

### Bloque C — Nuevos mecanismos

13. Evaluar hooks — 3 candidatos:
    - Hook on file save de tests/Page Objects: lint + typecheck
      automático
    - Hook on tool call de `git commit` o `gh pr create`: bloquear
      console.log, .only(), .skip() sin razón, selectores xpath
    - Hook on file save de `.claude/skills/*/SKILL.md`: validar
      frontmatter (description no vacía, ≤1024 chars, parseable)
14. **Probar Explore built-in subagent** con las preguntas del
    pain point de Fox ANTES de construir `/find-tests` custom:
    - "¿dónde están tests de X?"
    - "¿qué tests usan problem_user?"
    - "este flujo toca A y B, ¿dónde va el nuevo test?"
    - Si Explore resuelve 60%+, `/find-tests` custom pierde
      justificación o se reduce a subset específico (convenciones
      del framework que Explore no conoce)
15. Crear subagent custom `pr-reviewer` en
    `.claude/agents/pr-reviewer.md`:
    - Tools: Bash/Glob/Grep/Read (SIN Edit/Write)
    - Description con "proactively" + "when invoking this agent,
      tell it precisely which PR number or branch to review"
    - Skills declaradas: from-issue (y /find-tests si termina existiendo)
    - Output estructurado en 7 secciones:
      1. Summary
      2. Blockers (violaciones a reglas duras)
      3. Coverage Gaps (ACs no cubiertos)
      4. Warnings (assumptions no flageadas, selectores frágiles)
      5. Suggestions (mejoras opcionales)
      6. Approval Status: READY_TO_MERGE / NEEDS_CHANGES / BLOCKED
      7. Obstacles Encountered

### Bloque D — Skills nuevas candidatas

Evaluar SOLO si el bloque C se completó y hay evidencia clara
de valor.

16. `/spec-review` — corre ANTES de `/from-issue`:
    - Verifica que los AC del ticket refinado sean EARS-válidos
    - Sin adjetivos ambiguos
    - Con al menos un Given/When/Then
    - Es el "cheap gate" pre-generación
17. `/find-tests` custom SOLO si Explore built-in no cubrió el
    pain point (step 14):
    - SKILL.md + references/ (coverage-map.md, conventions.md,
      examples.md) + scripts/ (find-test-by-keyword.sh,
      list-tests-by-tag.sh, page-object-coverage.sh)
    - allowed-tools: Read/Grep/Glob/Bash
    - Beneficio adicional: coverage-map.md podría regenerarse
      automáticamente desde tests (documentación viva)
18. `/plan-ticket` SOLO si `/from-issue` NO hace augment/enrich
    internamente (verificación en Fase 1.3):
    - Devuelve plan pre-ejecución
    - allowed-tools: Read + Atlassian MCP
    - references/ por área de la app

    > **CERRADO (2026-09-04)** — la condición no se cumple:
    > `/from-issue` **SÍ** hace augment internamente (modo AUGMENT,
    > ADR-0010; Step 8 lee el contributor set del archivo y Step 8.5
    > tiene duplicate-guard por título normalizado). Por la propia regla
    > de Fase 1.3, `/plan-ticket` pierde justificación.
    > **Matiz para el step 17 (`/find-tests`)**: el augment refuerza que
    > la necesidad existe, pero el lookup actual es un `ls` por
    > convención de nombre y solo mira
    > `tests/<feature>/<feature>.spec.ts` — no busca cobertura en el
    > resto del repo. El "segundo consumidor real" que pide YAGNI es más
    > débil de lo que asumía el plan; el step 14 (probar Explore
    > primero) sigue siendo el gate correcto.

### Bloque E — Presentación / portfolio (paralelo, no bloqueante)

19. TL;DR de 3-4 bullets al tope del README
20. GIF/screencast (~20s) del flujo `/from-issue` SW-11 → PR abierto
21. Sección "Failure modes & mitigations" en README, anticipando
    preguntas duras de entrevista:
    - ¿Cómo escala a app real, no saucedemo?
    - ¿Qué pasa cuando el LLM alucina un selector o AC?
    - ¿Cuánto cuesta correr `/from-issue` por ticket en tokens?
    - ¿Si Qase se cae o cambian de TCMS?
22. Primeras agent metrics aunque sean manuales (ej. "de 8 PRs
    generados con `/from-issue`, 6 pasaron review sin cambios")
23. Párrafo "why Skills instead of MCP server" para mostrar madurez
    de decisión
24. Considerar renombrar repo "ia" → "ai" para consistencia con inglés
25. Post corto en LinkedIn/dev.to explicando arquitectura
    authoring-vs-runtime para tracción de portfolio

---

## Roadmap DESPUÉS del piso base (NO abordar en este arranque)

Estos sub-proyectos vienen después de completar bloques A-B como
mínimo. Se listan acá para que no se cuelen antes de tiempo.

### Sub-proyecto: Bot Slack + `/investigate-bug`

**Estimación realista**: 2-4 semanas de trabajo enfocado para MVP
funcional. NO es proyecto de fin de semana.

**Pasos previos obligatorios**:

1. Analizar últimos 20 bugs reales del equipo (cuando haya cliente
   nuevo) → clasificar cuántos son reproducibles con Playwright web.
   Si <50%, replantear scope. Bugs típicos de UI reproducible: sí.
   Race conditions, emails, performance, visual/CSS: no.
2. Definir estrategia de auth enterprise ANTES de la lógica del bot.
   Con saucedemo es trivial; con cliente real es el primer bloqueador.
   Opciones:
   - A) Scraping cookies desde API interna (preferida)
   - B) URL con token pre-construido
   - C) storageState de Playwright reusado (preferida)
   - D) **NUNCA** automatizar flujo Okta UI (frágil, MFA lo rompe)
3. Prototipar la skill `/investigate-bug` sola (invocable desde CLI,
   sin Slack bot todavía). Si funciona bien, el bot es solo la capa
   de entrada.

**Facturación (verificar al arrancar)**: Claude Pro da crédito
mensual para uso programático vía Claude Agent SDK a tarifas API.
No acumulable. Suficiente para prototipar (~400 invocaciones/mes
a 50k tokens), insuficiente para uso constante en equipo. Para
producción con cliente: usar API key dedicada del cliente, no Pro
personal. Diseñar bot encapsulando cliente Anthropic (swappable
Pro/API). Logging de tokens desde día uno.

**Narrativa para portfolio**: NO "ahorra tiempo creando tickets".
SÍ "bugs entran verificados, cross-referenciados con cobertura
existente, y con evidencia técnica que humanos difícilmente
producen manualmente".

### Otras mejoras al framework (post piso base)

- **Cross-browser** (ADR-0004 diferido) — estructura de projects
  data-driven ya lista para absorberlo sin refactor grande
- **Feedback loop de flakiness** — tool/skill que analice históricos
  de Qase runs, detecte selectores flaky, y advierta a `/from-issue`
  durante autoría
- **Métricas del agente** — dashboard o skill que mida % de PRs
  generados por `/from-issue` que pasan review sin cambios
- **MCP server propio del framework** — exponer catálogo
  (framework://coverage, framework://test-suites,
  framework://tcms-mapping, framework://page-objects,
  search_tests_by_page_object, find_tests_covering_flow) para
  consumo desde clientes no-Claude. YAGNI: no construir antes de
  necesidad real de consumo externo

### Skills personales transversales

Vivirían en `~/.claude/skills/` (no en este repo), pero surgen del
mismo trabajo:

- `commit-message` con formato preferido
- `create-adr` (o `document-decision`) — crear cuando arranque
  con próximo cliente Y note que va a escribir su primer ADR ahí
  (señal de reutilización real). Un template plano en
  `docs/adr/TEMPLATE.md` resuelve el 80% del problema para las
  5-10 veces que se usará en toda la vida del framework

---

## Guardarraíles para Claude Code al ejecutar este plan

Cuando le pases este roadmap a Claude Code:

- No proponer mejoras fuera de este plan sin justificación
  explícita ligada a un hallazgo de Fase 1
- Si detecta algo en Fase 1 que contradice el plan de Fase 2,
  decirlo explícitamente antes de arrancar
- Los bloques A-B-C-D-E son secuenciales dentro del bloque; solo
  E puede ir en paralelo cuando se apruebe
- Antes de refactor grande: proponer y esperar aprobación
- No sugerir arrancar por el sub-proyecto del bot Slack (viene
  después del piso base)
