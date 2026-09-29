import { MarkdownLoader } from '../../src/loaders/markdownLoader';
import { DocumentNotFoundError } from '../../src/errors/DanteErrors';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('fs', () => {
    const original = jest.requireActual('fs');
    return {
        ...original,
        promises: {
            readFile: jest.fn()
        }
    }
});

describe('MarkdownLoader', () => {
    const rootDir = '/fake/root';
    const loader = new MarkdownLoader(rootDir);

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Debe inicializarse con el default fallback param process.cwd', () => {
        const defaultLoader = new MarkdownLoader();
        expect(defaultLoader).toBeInstanceOf(MarkdownLoader);
    });

    it('Debe leer exitosamente un documento válido de un directorio base', async () => {
        const fakePath = path.join(rootDir, 'brain', 'nostradamuz.md');
        (fs.promises.readFile as jest.Mock).mockResolvedValueOnce('contenido markdown');

        const content = await loader.loadMarkdown('nostradamuz.md');
        expect(content).toBe('contenido markdown');
    });

    it('Debe rechazar rutas fuera de los límites permitidos (Directory Traversal)', async () => {
        await expect(loader.loadMarkdown('../../../etc/passwd')).rejects.toThrow(DocumentNotFoundError);
    });

    it('Debe lanzar error si el archivo no existe en ninguna baseDir', async () => {
        const error = new Error('ENOENT');
        (error as any).code = 'ENOENT';
        (fs.promises.readFile as jest.Mock).mockRejectedValue(error);

        await expect(loader.loadMarkdown('no-existe.md')).rejects.toThrow(DocumentNotFoundError);
    });

    it('Debe lanzar error original si no es ENOENT', async () => {
        const error = new Error('EACCES');
        (error as any).code = 'EACCES';
        (fs.promises.readFile as jest.Mock).mockRejectedValue(error);

        await expect(loader.loadMarkdown('archivo.md')).rejects.toThrow('EACCES');
    });
});
