import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta } from './types';
import type { QaseConfig } from '../utils/qase-env';

interface Entity {
  id: number;
  title: string;
  parent_id?: number | null;
  suite_id?: number | null;
}
interface ListResp {
  result: { entities: Entity[] };
}
interface IdResp {
  result: { id: number };
}

// The seam: the ONLY module that knows Qase's REST API. A future Xray/Zephyr/Kiwi
// client implements the same TcmsSeam interface. Auth is the `Token:` header
// (confirm against the token's curl example — see plan Task 9).
export class QaseClient implements TcmsSeam {
  constructor(private readonly cfg: QaseConfig) {}

  private async rpc<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.cfg.apiHost}${path}`, {
      method,
      headers: { Token: this.cfg.apiToken, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Qase ${method} ${path} → ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async ensureSuitePath(path: string[]): Promise<number> {
    if (path.length === 0) throw new Error('ensureSuitePath: path must not be empty');
    let parentId: number | undefined;
    let suiteId = 0;
    for (const title of path) {
      suiteId = await this.ensureSuite(title, parentId);
      parentId = suiteId;
    }
    return suiteId;
  }

  private async ensureSuite(title: string, parentId?: number): Promise<number> {
    const code = this.cfg.projectCode;
    // Title search is narrow at project scale; 100 is ample, so no pagination.
    const q = new URLSearchParams({ 'filters[search]': title, limit: '100' });
    const found = await this.rpc<ListResp>('GET', `/suite/${code}?${q}`);
    const match = found.result.entities.find(
      (s) => s.title === title && (s.parent_id ?? undefined) === parentId,
    );
    if (match) return match.id;
    const created = await this.rpc<IdResp>('POST', `/suite/${code}`, {
      title,
      parent_id: parentId,
    });
    return created.result.id;
  }

  async upsertCase(suiteId: number, c: TcmsCase): Promise<number> {
    const code = this.cfg.projectCode;
    // Title search is narrow at project scale; 100 is ample, so no pagination.
    const q = new URLSearchParams({ 'filters[search]': c.title, limit: '100' });
    const found = await this.rpc<ListResp>('GET', `/case/${code}?${q}`);
    const body = {
      title: c.title,
      suite_id: suiteId,
      description: c.description,
      preconditions: c.preconditions,
      steps_type: 'classic',
      steps: c.steps.map((s, i) => ({
        position: i + 1,
        action: s.action,
        expected_result: s.expected,
      })),
    };
    // suiteId always comes from ensureSuitePath (> 0), so a raw === on suite_id is safe here.
    const match = found.result.entities.find((x) => x.title === c.title && x.suite_id === suiteId);
    if (match) {
      await this.rpc('PATCH', `/case/${code}/${match.id}`, body);
      return match.id;
    }
    const created = await this.rpc<IdResp>('POST', `/case/${code}`, body);
    return created.result.id;
  }

  async recordResults(results: CaseResult[], meta: SyncMeta): Promise<void> {
    const code = this.cfg.projectCode;
    const run = await this.rpc<IdResp>('POST', `/run/${code}`, {
      title: meta.runTitle,
      cases: results.map((r) => r.caseId),
      is_autotest: true,
    });
    for (const r of results) {
      await this.rpc('POST', `/result/${code}/${run.result.id}`, {
        case_id: r.caseId,
        status: r.status,
      });
    }
  }
}
