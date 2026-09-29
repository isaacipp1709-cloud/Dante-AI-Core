import { promises as fs } from 'fs';
import * as path from 'path';
import { DocumentNotFoundError } from '../errors/DanteErrors';

export class MarkdownLoader {
  private baseDirs: string[];

  constructor(rootDir: string = process.cwd()) {
    this.baseDirs = [
      path.join(rootDir, 'brain'),
      path.join(rootDir, 'consciousness'),
      path.join(rootDir, 'instructions'),
      path.join(rootDir, 'neurons'),
      path.join(rootDir, 'audit')
    ];
  }

  public async loadMarkdown(relativePath: string): Promise<string> {
    for (const dir of this.baseDirs) {
      const fullPath = path.join(dir, relativePath);
      // Validar si el fullPath está dentro de los baseDirs para evitar Directory Traversal
      if (!fullPath.startsWith(dir)) {
          throw new DocumentNotFoundError(`Ruta fuera de límites permitidos: ${relativePath}`);
      }

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        return content;
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          throw e; // Lanza si es error de permisos u otro
        }
        // Continúa buscando en el siguiente directorio
      }
    }

    throw new DocumentNotFoundError(`El archivo Markdown no fue encontrado en los directorios permitidos: ${relativePath}`);
  }
}
