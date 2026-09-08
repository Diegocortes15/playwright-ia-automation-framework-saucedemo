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
  /scaffold-page-object, /report-bug, /playwright-cli — **cinco**, no cuatro;
  /report-bug entró en el PR #43 y varias notas de abajo siguen diciendo "las 4 skills"
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

> **Revisado 2026-09-07 contra la práctica documentada.** Se contrastó con el
> [Azure Well-Architected Framework][waf], [arc42 §9][arc42] y el
> [post original de Nygard][nygard]. Dos mitades se confirmaron tal cual, dos
> estaban flojas y se ajustaron. El detalle y las fuentes están en
> `docs/adr/README.md`.

**La inmutabilidad se queda — no era el problema.** Es la guía de Microsoft
palabra por palabra: _"The ADR serves as an append-only log. Don't go back and
edit accepted records. If a decision changes, write a new record that supersedes
the original and link the two together."_ Al revertir: NUEVO ADR + marcar el
anterior `Superseded by ADR-XXXX`. NUNCA editar un ADR aceptado.

**La vara de admisión sube a la de Microsoft**, que es más estricta que
"cambió una decisión arquitectónica":

> _Only include choices that affect the system's **structure**, **key quality
> attributes**, or are **difficult to reverse**._

Si no pasa la vara, la decisión igual se escribe — en la reference o el doc que
gobierna, donde va a estar parada la persona a la que le afecta. ADR-0025 es el
ejemplo a medir: arregló un bug real, y por esta vara debió ser el arreglo más
una nota.

**Los ADRs NO son la guía de diseño.** Microsoft otra vez: _"Avoid making
decision records design guides."_ Esta es la causa real del dolor de
mantenimiento — si para saber cómo carga JSON hoy hay que leer 0005 **y** 0023,
estás leyendo un log de auditoría para averiguar el presente. Dos capas:

- **Presente (mutable):** `docs/architecture.md` y `docs/app/`. Se corrigen en el
  lugar cuando cambian, con nota de qué decían antes. Es el §4 de arc42.
- **Log (inmutable):** `docs/adr/`. Solo el _por qué_, nunca el _qué es hoy_.

**El número: contá solo decisiones originales.** El 10-20 era una convención
local sin fuente citada — ni Nygard ni arc42 ni Microsoft prescriben cantidad — y
tomado literal contradice la regla de supersede, que fabrica registros
mecánicamente. Al 2026-09-07: 26 registros, 8 de ellos exigidos por esa regla,
**18 decisiones originales**. El conteo vive en `docs/adr/README.md` para que sea
visible antes de escribir el siguiente, que es lo que nadie podía hacer antes.

Regla mental que sobrevive intacta: _"¿un nuevo dev en 6 meses necesitaría esto
para entender por qué el código está así?"_

[waf]: https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record
[arc42]: https://docs.arc42.org/section-9/
[nygard]: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

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
   _(Revertido el 2026-09-07: se descartó también como comando manual — ver el ítem
   tachado más abajo. El texto de arriba queda como estaba en su momento.)_
6. **PR rojo: RESUELTO** (ADR-0020, 2026-09-04). `/from-issue` ya no abre
   PRs rojos. Loop de 3 intentos de arreglo durante el authoring, con
   diagnóstico previo obligatorio de si el error es del código generado o
   **de la app** — en el segundo caso para y reporta, porque el test
   encontró un bug y "arreglarlo" lo borraría. Lista dura de arreglos
   prohibidos (borrar/skipear tests, debilitar aserciones, cambiar el valor
   esperado por el que emitió la app). Si no llega a verde: sin rama, sin
   commit, sin push, sin PR, sin artefacto TCMS. ADR-0020 scopea ADR-0012:
   el review gate sigue absorbiendo _juicio_, ya no _artefactos rotos_.
7. **Obstacles Encountered: HECHO** (ADR-0022, 2026-09-05). Ítem NUEVO,
   pedido por el user. Sección obligatoria de reporte en las 3 skills propias
   (`/playwright-cli` queda afuera: es vendored y se regeneraría encima).
   Se renderiza SIEMPRE, incluso vacía (`None.`) — una sección que se puede
   omitir es una que el agente aprende a omitir.

   Alcance **definido por exclusión**, para que no duplique lo que ya se
   reporta (assumptions, fix log, colisiones): lleva solo degradaciones de
   selector, fricción de herramientas, y **huecos en las propias
   `references/` de la skill** — este último es el que responde tu pregunta
   de qué le impide a la skill funcionar como debería, y obliga a nombrar el
   archivo que debería haber cubierto el caso.

   Las degradaciones de selector se registran **en el momento de elegirlas**
   (scaffold Step 8, from-issue Step 5), no reconstruidas al final. En
   `/refine-ticket` va solo a la terminal: nunca al ticket, porque el
   write-back es el bloque de AC refinados y nada más (ADR-0013).

8. **Observaciones de runtime: HECHO** (ADR-0021, 2026-09-04). Ítem NUEVO,
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

9. **B12b arrancado**: primer script extraído,
   `from-issue/scripts/typecheck-spec.sh` (Step 9). Al escribirlo apareció
   un bug latente que la prosa escondía: el workflow decía `npx tsc`, y sin
   `node_modules` npx baja **`tsc@2.0.4`** del registry — un paquete squatter
   deprecado que no es el compilador. El skill podía registrar
   "Typecheck ✅ PASS" sin haber typechequeado nada. El script resuelve `tsc`
   solo desde `node_modules/.bin` y falla con exit 69 si no está.
   Es la mejor evidencia del principio #3 que apareció hasta ahora.
10. **Portabilidad de skills: HECHO** (ADR-0019, 2026-09-04). Las skills
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
>   _(Revertido el 2026-09-07: descartado también como comando manual, porque un `grep`
>   de una línea encuentra lo mismo sin sus dos falsos positivos y sin `brew trust`. El
>   conteo de tokens sigue siendo lo único que no se reemplaza — ver el ítem tachado.)_
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

9. ~~**Adoptar EARS notation en `/refine-ticket`**~~ — **HECHO (2026-09-07).**
   Rubric item 10, con los cinco patrones y el mapeo `WHEN`→Positive /
   `IF…THEN`→Negative documentado. Dos desvíos del pedido original, ambos
   deliberados: se usa el nombre real del sistema ("the login page shall…")
   en vez de las palabras literales "THE SYSTEM SHALL", porque el slot de
   EARS está pensado para eso y un ticket lo lee una persona; y se registró
   explícitamente que **`Edge` no tiene contraparte en EARS**, así que la
   keyword es pista para Positive-vs-Negative y nunca argumento para
   reclasificar (caso real: SW-15 AC 3). Sin ADR nuevo: el roadmap ya había
   tomado la decisión, esto la implementa.
10. ~~Formalizar Given/When/Then como estructura obligatoria en el
    template de specs Playwright que usa `/from-issue`~~ — **DESCARTADO
    (2026-09-07).** EARS ya cubre lo que este step buscaba —trigger explícito y
    una sola aserción por criterio— **en el ticket, que es donde el AC nace**
    (step 9). Y los specs ya tienen estructura real y verificable:
    `describe(feature — contexto)` → `describe(bucket)` → `test(prosa)`, con los
    pasos nombrados saliendo de los `test.step` de los Page Objects, que sí
    aparecen en el reporte. Comentarios `// Given / // When / // Then`
    obligatorios encima de eso serían estructura que **ningún lint verifica y
    ningún reporte muestra** — decoración que se pudre igual que se pudrió
    `architecture.md`. Es el "teatro burocrático" del principio #5.
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
    - ~~Hook on tool call de `git commit` o `gh pr create`: bloquear
      console.log, .only(), .skip() sin razón, selectores xpath~~ —
      **ya innecesario (2026-09-07)**: el lint bloquea xpath, `.only()`
      (`no-focused-test`, verificado inyectando uno) y `.skip()`, y corre
      como gate de CI. Un hook sería una segunda verificación más débil
    - Hook on file save de `.claude/skills/*/SKILL.md`: validar
      frontmatter (description no vacía, ≤1024 chars, parseable)
14. ~~**Probar Explore built-in subagent** antes de construir `/find-tests`~~ —
    **HECHO (2026-09-07). `/find-tests` DESCARTADO: Explore sacó 9/9.**

    Un agente por pregunta, para que no se contaminaran, y la rúbrica se congeló **antes**
    de leer las respuestas. El umbral del ítem era 60%.

    | Pregunta                           | Puntos | Lo que resolvió                                                                                                                                |
    | ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
    | ¿dónde están los tests de sorting? | 3/3    | Los dos bloques; que los de `@problem` son `test.fail()` contra SW-14 vía ADR-0024; descartó el hit de `_framework_validation` como no-sorting |
    | ¿qué tests usan problem_user?      | 3/3    | Separó _correr como_ el usuario de _usar sus credenciales_ en `chromium-no-auth`; explicó el routing por `AUTH_USERS`                          |
    | ¿dónde va el test nuevo?           | 3/3    | Augmentar (ADR-0010), buckets, `{ tag }` (ADR-0015), `@fixtures/test`, y la regla #4                                                           |

    **No se reduce a "el subset de convenciones que Explore no conoce", porque no hubo tal
    subset.** Citó números de ADR, reglas de eslint, que el fixture `_reportAnnotation` deriva
    el feature con `basename(dirname(testInfo.file))`, y que hace falta el registro companion
    en `.tcms/records/<feature>.json`. La premisa del ítem —que las convenciones del framework
    serían el hueco— resultó falsa: es justo donde estuvo más fuerte.

    **Encontró dos cosas que la verdad de referencia no tenía**, y una de ellas era un defecto:
    - `product_detail.spec.ts` afirmaba el badge con `expect(await …)` justo después de
      `clickAddToCart()` — una lectura única, sin reintento, contra un badge que el cliente
      renderiza después del click. Corregido a `expect.poll`. La aserción del `0` inicial se
      dejó como estaba **a propósito**, con el motivo escrito al lado: no sigue a ninguna
      acción, y pollear un `0` pasa igual de vacuamente contra una página a medio renderizar.
    - **`@all-users` no lo usa ningún test.** Está en el `grep` de `playwright.config.ts` y
      documentado en la tabla de `CLAUDE.md`, pero cero specs lo llevan, así que hoy todo test
      está clavado a un usuario. No es un bug —ADR-0014 hace crecer por demanda— pero la tabla
      se lee como si estuviera en uso.

    Lo que Explore **no** hace, y conviene no olvidar: no escribe, no decide, y arranca en frío
    cada vez. Sirve para _encontrar_, no para _mantener_.

15. ~~Crear subagent custom `pr-reviewer`~~ — **DESCARTADO (2026-09-07).**
    No era mala idea; **el terreno cambió debajo**. Se escribió antes de
    ADR-0022, antes de que el lint tuviera las reglas de ADR-0001/0003/0015/0023,
    y sin contar con `/code-review`, que ya existe como skill de primera parte.
    Mapeadas sus 7 secciones contra lo que hay hoy:

    | Sección                                        | Estado                                                       |
    | ---------------------------------------------- | ------------------------------------------------------------ |
    | 1. Summary                                     | Cubierta por `/code-review`                                  |
    | **2. Blockers**                                | **Cubierta por el lint, y mejor**                            |
    | 3. Coverage Gaps                               | El único hueco real — ver abajo                              |
    | 4. Warnings (selectores frágiles, assumptions) | Cubierta por ADR-0022                                        |
    | 5. Suggestions                                 | Cubierta por `/code-review`                                  |
    | 6. Approval Status                             | Decisión humana; un agente diciendo READY_TO_MERGE es teatro |
    | 7. Obstacles Encountered                       | Proceso del propio reviewer                                  |

    **La sección 2 es la que lo mata.** `eslint.config.js` ya falla el build por
    ADR-0001 reglas #3/#4/#8, ADR-0003, ADR-0015 (dos reglas), ADR-0023, XPath,
    `waitForTimeout`, `.only()`, `.skip()`, `expect-expect` y
    `prefer-web-first-assertions` — todas deterministas, todas como gate, con
    `--max-warnings 0`. **Un subagente re-chequeando eso sería más débil, no más
    fuerte**: puede pasar por alto lo que una regla no puede. Choca con el
    principio #3 (la IA autoriza, el runtime es determinista).

    La 4 ya la resolvió ADR-0022 de una forma que el propio roadmap defendió como
    mejor: las degradaciones de selector se registran **en el momento de
    elegirlas**, no reconstruidas después por alguien mirando el diff.

    **El residuo honesto:** nadie verifica de forma independiente la tabla de AC
    coverage que `/from-issue` escribe sobre sí mismo. Es autodeclarada. Pero
    construir un subagente entero para eso viola el principio #1 (sin segundo
    consumidor real) y el #5 advierte contra orquestación multi-agente a esta
    escala. Si algún día duele, el arreglo es un chequeo chico, no un agente.

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

- [x] ~~**Cross-browser**~~ — **IMPLEMENTADO Y OPT-IN (2026-09-08, ADR-0027 supersede ADR-0004).**
      El ítem decía "ADR-0004 diferido", pero ADR-0004 no difería nada: decía **Accepted** y su
      Decisión mandaba agregar `firefox-standard` y `webkit-standard`. Nunca se implementaron, y
      `CLAUDE.md`, este roadmap y ADR-0014 lo citaban los tres como la razón de que el cross-browser
      **quedara afuera** — o sea, todos lo leían al revés de lo que decía. Cuatro meses en `Accepted`
      siendo falso, más que los tres y medio de ADR-0005 que el README de ADRs cuenta como escarmiento.

  Ahora: `npm test` sigue siendo chromium, y `CROSS_BROWSER=1` suma cuatro proyectos
  (`firefox-no-auth`, `firefox-standard`, `webkit-no-auth`, `webkit-standard`) vía
  `npm run test:firefox` / `test:webkit` / `test:cross`, con cualquier scope encima
  (`-- --grep "@smoke"` da 9 tests en ~11 s). **La suite pasa entera en los dos motores** —
  79 en Firefox, 79 en WebKit — pregunta que estuvo abierta cuatro meses.

  El guardarraíl de ADR-0004 sobrevive y es la parte que todos citaban: **solo el usuario
  estándar**, nunca una matriz por-usuario-por-browser.

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

## Bloqueado por Jira (2026-09-05)

~~Se perdió el acceso a la instancia gratis de Jira por inactividad, y ya se pidió de nuevo.~~
**RESUELTO el 2026-09-06.** El MCP reconectó, el proyecto `SW` sobrevivió intacto, y `/from-issue`
corrió end-to-end contra tickets reales de Jira en sus dos ramas críticas: camino feliz (SW-12 →
PR #48, verde al primer intento) y contradicción app-vs-AC (SW-13 → bloqueado sin PR, después
aterrizado como `test.fail()` contra SW-14 → PR #49).

Lo que **sigue bloqueado** es `/refine-ticket` end-to-end, pero por otra causa: **Confluence no
está accesible** en este site (404 en el endpoint, y el token declara solo `read/write:jira-work`).
No se distingue desde la API si el producto no está provisionado o si el grant nunca pidió los
scopes.

El hallazgo más grande de correrlo no tuvo nada que ver con los ADR 0019–0022:
**`/scaffold-page-object` abortaba en toda invocación desde el 2026-06-03** y nadie lo sabía porque
nunca se había ejecutado (PR #47, ADR-0025). El registro completo de qué se verificó y cómo quedó en `docs/jira-restore-checklist.md`, **ya cerrado**; lo que sigue abierto está más abajo, en "Deuda conocida y decisiones abiertas".

Vale decirlo sin adornos: los ADR 0019–0022 se diseñaron y mergearon **sin haber corrido
`/from-issue` ni una vez** en esa sesión. Salieron de razonar sobre el código, no de ver el
pipeline funcionando. El checklist es cómo se paga esa deuda.

## Deuda conocida y decisiones abiertas (2026-09-07)

Heredado de `docs/jira-restore-checklist.md`, **que quedó cerrado** — ver ahí qué probó. Esto
es la lista viva; aquel archivo es el registro histórico. Los ítems están separados por lo que
realmente hace falta para cerrarlos, porque mezclarlos fue parte del problema: un defecto de
diez minutos y una decisión de diseño no se leen igual.

### Defectos abiertos — arreglables ya

> Estuvo vacía un día. Los tres que vivían acá se cerraron el 2026-09-07 (#63, #64, #65) y
> quedan tachados abajo en vez de borrados: los tres salieron de **correr** el pipeline,
> ninguno de leerlo. Borrar el registro borraría la evidencia de qué los encontró.

- [x] ~~**Una observación arreglada no se quita nunca, y nada avisa que ya no pasa**~~ —
      **arreglado el 2026-09-08, el mismo día que se encontró.** El índice gana `absentSince`, que se
      pone solo cuando la corrida ejercitó **todas** las features del `seenIn` de la entrada y aun así
      no la vio, y se borra sola apenas reaparece. Nada se elimina automáticamente: quitar la entrada
      sigue siendo acto humano (ADR-0021).

  **Correrlo corrigió el diseño dos veces.** Primero confirmó que la versión ingenua mentía —una
  corrida de un solo proyecto habría declarado muertas las otras once—. Y después, ya con la
  versión conservadora, marcó tres errores de CORS reales que **no** están arreglados sino que son
  intermitentes (`count: 1`, ocurrieron una vez en su vida). El mecanismo estaba bien; la
  redacción del digest era la que sacaba conclusiones, diciendo _"si eso es un arreglo, borrá la
  entrada"_. Ahora nombra las dos lecturas y no elige, igual que `/report-bug`.

  <details><summary>El diagnóstico original</summary>

  Encontrado el 2026-09-08 preguntando qué ocurre cuando un dev —o un tercero, como backtrace—
  arregla el 400/401 que quedó registrado.

  `mergeObservations` arranca metiendo **todas** las entradas previas en el mapa y solo pisa las
  que reaparecieron en la corrida. Así que una entrada cuya causa desapareció queda **congelada
  para siempre** con su último `count`, su `lastSeen` y su sample. Nada la borra, nada la marca.
  El único rastro es la fecha de `lastSeen` quedándose atrás, y el digest la imprime pero nunca
  dice _"esto ya no pasa"_: hay que mirar una fecha y acordarse de qué día es hoy.

  **Lo que lo vuelve un defecto y no una decisión es que el framework ya resolvió esto para el
  otro lado.** Un `test.fail()` avisa solo cuando el defecto se arregla — la corrida reporta
  _"Expected to fail, but passed."_ y ADR-0024 exige quitar el marcador en ese mismo PR. Las
  observaciones no tienen equivalente. Misma clase de problema, mecanismo de aviso en uno y no
  en el otro.

  **Y el arreglo obvio miente.** Marcar como vieja toda entrada cuyo `lastSeen` sea anterior a la
  corrida más reciente rompe con cualquier corrida parcial: correr solo `chromium-problem`
  marcaría como muertas las 11 entradas restantes. Para que el flag no mienta, el índice tiene
  que saber si la corrida fue **completa**, y eso ya es diseño con decisión atrás — probablemente
  un ADR, porque cambia el contrato del archivo.

  Consecuencia mientras tanto, que conviene tener presente al leer el digest: **`14 reviewed` no
  significa "14 cosas que pasan hoy"**, significa "14 cosas que pasaron alguna vez y alguien
  clasificó".

  </details>

- [x] ~~**`playwright-cli` no está en PATH**~~ — **cerrado (2026-09-07), las dos mitades.**
      El PATH lo arregló #63, que corrigió las 21 invocaciones nuestras a `npx`, dejó a propósito
      las 164 del `SKILL.md` vendored (se regenera: el arreglo se deshace solo y mientras tanto
      parece hecho) y puso el chequeo en CI. La otra mitad se cerró acá: el caveat del Step 5
      mandaba "fall back to manual login via `fill` + `click`", **inejecutable**, porque todo
      comando interactivo toma un `ref` de snapshot y no texto libre. Peor: en saucedemo ese
      fallback no es un caso de borde sino **el camino normal**, porque `state-load` nunca restaura
      sessionStorage. Ahora lleva la secuencia completa, corrida de verdad contra la app, más las
      dos trampas que encontró correrla: los refs se leen del snapshot propio, y una URL con `?` hay
      que encomillarla o zsh la expande y mata el comando antes de que el CLI arranque.
- [x] ~~**El duplicate-guard del Step 8.5 es file-scoped**~~ — **cerrado por #64 (2026-09-07).**
      Ahora compara solo dentro del context describe resuelto, la nota de skip dice en cuál matcheó,
      y un título idéntico en otro contexto está señalado como el caso multi-usuario que **debe**
      insertarse. De paso se sacó la instrucción de "strip leading tags": ADR-0015 sacó los tags de
      los títulos y tiene lint que falla ante cualquier `@`, así que esa rama era inalcanzable.
- [x] ~~**Un run bloqueado en AUGMENT deja archivos sucios**~~ — **cerrado por #65 (2026-09-07).**
      El workflow tiene una sección `## Aborting` única en vez de doce copias: todo aborto desde el
      Step 5 nombra lo que dejó, separado como lo ve `git status`, y **no revierte nada** — una
      corrida fallida es la única evidencia de por qué falló. Y `sync-base-branch.sh` ya no dice
      solo "working tree is dirty": nombra los paths y aclara que un aborto anterior deja
      exactamente eso. Verificado que los dos modos lo disparan, porque `--porcelain` cuenta
      untracked también.

### Decisiones abiertas a propósito

- **Nada en el proyecto puede presentar un defecto**, y ADR-0024 exige un identificador
  presentado antes de que un test aterrice como `test.fail()`. ADR-0026 evaluó que
  `/report-bug` presentara con aprobación y **lo rechazó por ahora**: _"files nothing"_ es la
  formulación más nítida del principio #2, y se presentó exactamente un defecto a mano.
  **Revisar cuando la fricción se sienta más de una vez.**
- [x] ~~**Los 401 de `events.backtrace.io`**~~ — **triados por #61 (2026-09-07), junto con la
      cola entera.** Las cinco entradas son una causa, leída del bundle y no deducida: saucedemo
      configura `url: https://submit.backtrace.io/UNIVERSE/TOKEN/json` con los placeholders
      literales sin reemplazar. De ahí el 401, y como un 401 no lleva `Access-Control-Allow-Origin`,
      el browser encima loguea el CORS **de esa misma respuesta**. No es defecto: credenciales
      reales en un bundle público serían peor. Sigue en pie la lectura que hacía valioso el ítem —
      en una app cliente esto significaría que el reporte de errores está muerto y nadie se entera.

### Verificaciones que esperan un disparador natural

No se fuerzan honestamente; se hacen cuando el trabajo real las provoque.

- **Exit 69 de `typecheck-spec.sh`** nunca disparó. Es el que existe para evitar un PASS no
  ganado, así que es el que más vale ver.
- **La sección Obstacles nunca salió `None.`** — ninguna corrida fue libre de fricción. El
  riesgo vivo ahora parece el inverso: son largas y alguien puede empezar a saltearlas.
- **El primer ticket que necesite `error_user`** debería cablearlo en `AUTH_USERS` (ADR-0014) y
  darle al detector de diálogos su primera cobertura e2e. **Ahora tiene un premio concreto
  medido:** es uno de los dos detectores que hoy solo cubre la sonda (ver arriba), así que
  cablearlo es lo que empieza a destrabar el borrado de `tests/_framework_validation/`.
- [x] ~~**Si los `test.fail()` de SW-13 graban observaciones.**~~ **Sí, verificado el
      2026-09-07** corriendo solo esos dos tests en aislamiento: el índice registró el 404 con
      `count: 2` y el sample nombrando `problem_user sorts products by name descending`. El fixture
      corre y sus datos llegan al reporter aunque la falla sea esperada.

  **Pero eso NO vuelve borrables las sondas, y ahora se sabe exactamente por qué.** Contando qué
  detector ejercita cada entrada del índice:

  | Detector         | Solo sonda | Tests reales |
  | ---------------- | ---------- | ------------ |
  | `console-error`  | 2          | **3**        |
  | `failed-request` | 0          | **7**        |
  | **`dialog`**     | 1          | **0**        |
  | **`page-error`** | 1          | **0**        |

  Dos de los cuatro detectores **no tienen otra cobertura**, así que borrar
  `tests/_framework_validation/` seguiría falsificando el `Enforced by:` de ADR-0021, que
  afirma que ahí se ejercitan los cuatro. Y cada uno está bloqueado por algo distinto:
  - **`dialog`** — solo el `alert()` de `error_user` al ordenar lo produce, y ese usuario no está
    en `AUTH_USERS` (ADR-0014, crecimiento por demanda). Se destraba con el primer ticket que lo
    necesite; hasta entonces ningún test real puede dispararlo.
  - **`page-error`** — una excepción no capturada en la página. Saucedemo no lanza ninguna en sus
    flujos normales, así que **puede no tener nunca un disparador natural**. La sonda la fabrica
    a propósito desde un timer.

  Esto convierte un ítem difuso ("mantenerlas hasta que `/from-issue` corra una vez") en una
  condición concreta: **son borrables cuando `dialog` y `page-error` tengan cobertura real, y no
  antes.**

- **Si el auto-link de GitHub-for-Jira funciona.** El chequeo disponible **no puede responderlo**:
  `getJiraIssueRemoteIssueLinks` devuelve `[]` hasta para tickets cuyo PR se mergeó hace meses,
  porque la app escribe "development information", que ese MCP no expone. Se confirma mirando el
  panel Development en el browser.

### Necesitan tu entorno o tu decisión

- [x] ~~**Instalar `skill-validator`**~~ — **DESCARTADO (2026-09-07).** El ítem afirmaba que
      varias skills cambiaron su grafo de links sin pasar por el único chequeo que verifica ADR-0019.
      La primera mitad era cierta; **la segunda era falsa**, y el propio ADR-0019 ya lo decía en sus
      alternativas: los cuatro defectos que la herramienta encontró alguna vez eran _"all broken
      links, **all findable with `grep`**"_.

  Medido antes de decidir. Un `grep` de una línea, ahora en README.md, contra una violación
  inyectada de **cada** modo de falla (escape del repo, y una skill apuntando al archivo de una
  hermana): las encontró las dos, y sobre el árbol limpio devuelve **cero**. Un script propio
  que resolvía rutas de verdad encontraba lo mismo pero con **3 falsos positivos**, y
  `skill-validator` trae **2** que este repo tuvo que documentar. El comando más corto ganó.

  La objeción **no fue de seguridad**: es un proyecto MIT sano de una org comunitaria
  independiente, y su `check` corre entero en local, sin red ni API key. Fue que instalarlo pide
  `brew trust` sobre un tap de terceros para reemplazar un `grep` que ya funciona mejor.

  **Cuándo volver a mirarlo:** su conteo de tokens, que ADR-0019 llama _"the part that earns its
  keep"_ y que ningún `grep` reemplaza — el día que haya que achicar una skill. Y el gate en CI
  sigue rechazado por ADR-0019 mientras se cumpla la escala que ese ADR nombra (un autor, pocas
  skills, cambiando algunas veces al año); lo que da vuelta la decisión no es que el framework
  sea profesional, es que las skills **salgan del repo**, porque ahí nadie va a grepear antes de
  un handoff del que no se enteró.

- [x] ~~**Bloque A step 2** — `claude --debug`~~ — **HECHO (2026-09-08). Sin errores silenciosos.**
      `claude doctor` no reporta problemas de instalación, y el log de arranque dice
      `Loaded 5 unique skills (5 unconditional, 0 conditional, project: 5)`: **las cinco cargan
      limpias**. Los `Failed to stat directory` que aparecen son todos de directorios opcionales que
      no existen (`agents`, `commands`, `output-styles`, cache de plugins), ninguno nuestro.

  Detalle de método que costó dos intentos y conviene no repetir: `claude --debug -p …` **no
  imprime el log** — devolvió 2 líneas y una advertencia de stdin. Lo que funciona es
  `claude --debug-file <path> -p … < /dev/null`, que escribió 178 líneas útiles.

  **De regalo, una pregunta que estaba abierta quedó respondida:** el MCP de Atlassian
  `Successfully connected (transport: http) in 840ms`, con token válido ~6 h. La conexión de
  Jira está viva y no hace falta nada para reconectarla.

- [x] ~~**Bloque A step 3** — auditar las `description`~~ — **HECHO (2026-09-08).**
      Las cinco tienen `name` y `description` no vacías, todas muy por debajo del límite de 1024
      (la más larga, `/refine-ticket`, usa 264 caracteres). Nada que arreglar ahí.

  Lo que sí salió: **`playwright-cli` tiene la descripción más corta y más vaga** — 11 palabras,
  _"Automate browser interactions, test web pages and work with Playwright tests"_ — y reclama
  terreno que en la práctica es de `/from-issue` o de un simple `npm test`. El solapamiento del
  resto es por diseño: `from-issue` comparte términos con todas porque es el orquestador que las
  compone.

  **No se arregla editándola**: es la skill vendored, se regenera con `install --skills`. Ya está
  compensado donde la regeneración no llega — `CLAUDE.md` acota cuándo se busca esta skill
  (descubrir selectores, verificarlos antes de escribir un test, leer el DOM renderizado), que es
  el mismo patrón que resolvió el problema del PATH en #63.

- **Correr `/skill-doctor`** — **lo tenés que correr vos.** Verificado el 2026-09-08: es un
  comando de UI de Claude Code, no una skill, así que no puedo invocarlo desde una sesión de
  agente. La versión instalada (2.1.263) cumple el mínimo que pide (v2.1.252+).
- **Bug desde una conversación de Slack — un MCP propio de este repo.** Idea tuya (2026-09-08):
  cuando un issue se discute en un canal y la conclusión es "esto es un bug", que el hilo se
  convierta en un ticket sin que nadie transcriba nada a mano. Es el mismo problema que
  `/report-bug` resuelve para una corrida fallida, con otra fuente de entrada.

  **Orden decidido: la evidencia de Jira va inmediatamente antes de esto, y esto va al final de
  todo.** No al revés — atacar primero el adjunto de evidencia deja resuelto el "cómo sube un
  archivo a un ticket", que es exactamente lo que este MCP necesitaría después para no nacer
  cojo. Y hasta que no haya un segundo consumidor real, ADR-0026 sigue diciendo que un defecto
  presentado a mano no justifica escribir a un tracker.

- **La evidencia no es compartible — resuelta la mitad difícil (2026-09-07).** El problema no
  era solo que las rutas fueran absolutas: Playwright escribe en directorios llamados
  `inventory-inventory-invent-6da45-products-by-price-ascending-chromium-problem`, así que ni
  quien la reportaba encontraba los archivos. `/report-bug` ahora corre
  `scripts/collect-evidence.mjs`, que copia screenshot, video y trace a **una carpeta legible**
  bajo `bug-evidence/` con un `README.txt` que lleva el error y cómo abrir el trace. Copia
  nunca mueve; el output original queda intacto.

  **Lo que sigue abierto es adjuntarla — PENDIENTE DE REVISAR, no de investigar.** Las vías
  gratuitas están agotadas, verificado el 2026-09-07:

  | Vía                                     | Estado                                                                                                                                                                                                                                                             |
  | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Tool de adjuntos en el MCP de Atlassian | **No existe.** Hay comment, worklog, create, edit, get, transition, remote links — nada de attachments                                                                                                                                                             |
  | CLI oficial de Atlassian (`acli`)       | **Tampoco.** `jira workitem` tiene `attachment-list` y `attachment-delete` pero **ninguno para subir**. La asimetría es lo que hace concluyente el hallazgo: si faltara toda la familia sería un hueco de la doc; están las dos hermanas y falta justo la de crear |
  | Token de Jira en el repo o el entorno   | No hay ninguno. El OAuth del MCP vive dentro del servidor y no es reutilizable                                                                                                                                                                                     |

  Queda **una sola vía real**: la REST API con `curl` y un API token propio
  (`POST /rest/api/3/issue/<KEY>/attachments`, header `X-Atlassian-Token: no-check`). Técnicamente
  trivial; el costo es de diseño. Sería **la primera credencial de Jira viviendo en el repo**, y le
  daría escritura directa **fuera** del MCP, salteando el único canal que hoy pasa por aprobación
  humana — justo lo que ADR-0013 acotó a propósito. Encima repite la pregunta que ADR-0026 ya
  respondió con "todavía no" para presentar bugs.

  **El disparador para revisarlo es la fricción medida, no la incomodidad teórica.** Hoy lo caro
  —encontrar los archivos— está resuelto: un zip listo con screenshot, video y README. Arrastrarlo
  son cinco segundos. Si tras unos cuantos bugs presentados eso molesta de verdad, ahí el token y
  el ADR se justifican.

### Sigue en pie del plan original

- [x] ~~**Backfill de `Enforced by:`**~~ — **ya estaba hecho**, lo cerró PR #45; los 26 ADRs
      tienen el campo. Este ítem sobrevivió al triaje por inercia y se verificó el 2026-09-07
      recorriéndolos uno por uno.
- [x] ~~**Auditar los `Nothing — prose only`**~~ — **hecho el 2026-09-07**, los 26 uno por uno.
      Siete lo declaran: ADR-0006, 0007, 0009, 0010, 0012, 0020, 0022.

      **Cinco están bien así.** ADR-0010, 0020 y 0022 gobiernan la conducta de un agente —
      ninguna máquina puede verificar que un diagnóstico fue honesto o que una sección
      `Obstacles` dice la verdad, y ADR-0022 ya lo argumenta en sus propias alternativas.
      ADR-0006 y 0009 registran una elección sin invariante que chequear.

      **Uno sí era chequeable y ya tiene gate: ADR-0007.** Decide algo sin ambigüedad — _"Do not
      install a GitHub MCP server"_ — sobre un archivo, `.mcp.json`, que ningún linter lee.
      Instalar un MCP es una acción de un comando, así que la decisión podía revertirse sin
      dejar rastro. Lo cubre `scripts/check-adr-invariants.mjs` (`npm run lint:adr`, en CI).

      **ADR-0012 se descartó, y conviene dejar escrito por qué** para no re-litigarlo: el chequeo
      posible es la forma del nombre de rama, y las ramas humanas de este repo (`fix/…`,
      `docs/…`, `chore/…`) lo violarían todas, así que el gate necesitaría exceptuar justo lo
      que no puede distinguir. El ADR ya admite que la forma es chequeable y la fidelidad de la
      normalización no; certificar la cáscara y no el contenido compra tranquilidad falsa, que
      es peor que no tener gate.

- [x] ~~**Reescribir el walkthrough sobre una corrida real**~~ — **HECHO (2026-09-08).**
      `docs/walkthrough.md`, 182 líneas contra las 201 del cerrado, sobre SW-15 (#53) y SW-13 (#49)
      en vez de un ticket inventado. Abre con la idea que lo vuelve entendible y que el doc de julio
      no tenía: **la IA escribe una sola vez y el runtime es Playwright puro** leyendo artefactos
      commiteados — por eso quien clona el repo sin Claude Code igual ve los links de Jira, el
      criterio que cada test cubre y la explicación en prosa de las fallas esperadas. Lo que no
      obtiene es una explicación _nueva_ para un defecto _nuevo_.

  <details><summary>Por qué se cerró el #35</summary>

  PR #35 se **cerró el 2026-09-07**, no
  porque la idea estuviera mal sino porque el pipeline que documentaba ya no existe: escrito el
  2026-07-02, no menciona ninguna vez ADR-0020 (nunca abre un PR rojo, con loop de 3 intentos),
  ADR-0024 (`test.fail()`), ADR-0010 (augment), ADR-0022 (Obstacles) ni ADR-0021
  (observaciones) — todo decidido después. Y camina un ticket **ficticio**, `SW-42`, en un repo
  que hoy tiene tres corridas reales con la cadena de artefactos completa.

  **Lo que se reusa es la forma**, que era buena: el modelo mental, la tabla de cadena de
  artefactos y el "explicalo en una oración". Lo que cambia es que deje de ser hipotético.

  Columna vertebral **SW-15** (#53, camino feliz de punta a punta) y **SW-13** (#49) como la
  rama que importa: la app contradice un AC, **no se abre PR**, y el test aterriza como
  `test.fail()` clavado a SW-14. Esa rama es lo que hace a este framework distinto de un repo
  Playwright normal, y es exactamente lo que un documento de julio no podía contar.

  Una cosa que el PR cerrado **sí tenía bien**: la nota de elección de herramientas era correcta
  —_"tickets come from Jira via the Atlassian MCP (never `gh issue`)"_, citando ADR-0007—.
  Verificado, no asumido.

  </details>

- **B12b — más extracción a `scripts/`.** Van tres (`typecheck-spec.sh`,
  `check-component-signatures.sh`, `typecheck-generated.sh`). Próximos candidatos: el preflight
  de rama (Step 1.5) y el render del PR body (Step 12). YAGNI por candidato.
- **Bloque B11 — `AGENTS.md`.** Vale cuestionarlo antes de hacerlo: `CLAUDE.md` está en 142
  líneas y ya es la constitución de facto.
- [x] ~~**Bloque C**~~ — **CERRADO ENTERO (2026-09-08).** `/find-tests` descartado (#67: Explore
      sacó 9/9), `pr-reviewer` descartado (el terreno cambió debajo), y el **hook de frontmatter de
      `SKILL.md` se descarta por YAGNI, con la medición del mismo día que lo respalda**: el Bloque A
      step 3 recorrió las cinco skills y las cinco tienen `name` y `description` no vacía, todas muy
      por debajo del límite de 1024. **El hook no guardaría nada hoy.** Mismo argumento con el que
      ADR-0019 rechazó su gate de CI y con el que se descartó `skill-validator`: a esta escala, un
      gate sobre algo ya limpio que cambia pocas veces al año es teatro.
      **Disparador para reconsiderarlo:** cuando escriba skills acá alguien más que el autor único.
- **Bloque E** — presentación y portfolio, en paralelo cuando quieras.

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
