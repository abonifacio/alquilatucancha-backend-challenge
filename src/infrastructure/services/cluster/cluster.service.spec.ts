import { Test, TestingModule } from '@nestjs/testing';
import * as _cluster from 'cluster';

import { ClusterService } from './cluster.service';
const cluster = _cluster as unknown as _cluster.Cluster; // typings fix

describe('ClusterService', () => {
  let service: ClusterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClusterService],
    }).compile();

    service = module.get<ClusterService>(ClusterService);
  });

  it('should be a primary cluster', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(cluster.isPrimary).toBeTruthy();
  });
});
