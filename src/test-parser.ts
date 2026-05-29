import { ASTProcessor } from "./ast-processor.js";

const sampleCode = `
import { Injectable } from '@nestjs/common';

@Injectable()
export class WaitQueueService {
  constructor() {}

  async processQueue(queueId: string) {
    const data = await this.fetchQueueData(queueId);
    if (!data) {
      this.logError("Empty queue data");
      return;
    }
    const validated = this.validateQueueItem(data);
    await this.saveQueueStatus(validated);
  }

  private async fetchQueueData(id: string) {
    return { id, status: 'pending' };
  }

  private validateQueueItem(item: any) {
    return { ...item, status: 'validated' };
  }

  private async saveQueueStatus(item: any) {
    console.log("Saving queue status", item);
  }

  private logError(msg: string) {
    console.error(msg);
  }
}
`;

console.log("--- Starting AST Parser & Chunking Test ---");
const processor = new ASTProcessor();
const chunks = processor.parseAndChunk("src/wait-queue.service.ts", sampleCode, "QMS-WaitQueue");

console.log(`Total chunks extracted: ${chunks.length}\n`);

chunks.forEach((chunk, index) => {
  console.log(`[Chunk #${index + 1}]`);
  console.log(`Type: ${chunk.type}`);
  console.log(`Metadata: ${JSON.stringify(chunk.metadata)}`);
  console.log(`Edges: ${JSON.stringify(chunk.edges)}`);
  console.log(`Content Preview:`);
  console.log(chunk.content.substring(0, 300));
  console.log("-------------------------------------------\n");
});
