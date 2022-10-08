import { Injectable } from '@nestjs/common';
import * as _cluster from 'cluster';
import * as os from 'os';
const cluster = _cluster as unknown as _cluster.Cluster; // typings fix

const numCPUs = os.cpus().length;

@Injectable()
export class ClusterService {
  static clusterize(callback: any): void {
    // https://nodejs.org/api/cluster.html#clusterisprimary
    // creamos un fork por cada procesador del cpu para optimizar la performance
    if (cluster.isPrimary) {
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
    } else {
      console.log(`Cluster server started on ${process.pid}`);
      callback();
    }
  }
}
