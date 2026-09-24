import "server-only";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

/** Reorganiza um vídeo MP4/MOV pra ter o metadado (moov) no início do
 * arquivo em vez do fim — formato comum em vídeo gravado direto no celular
 * ("moov no fim"), que faz o navegador precisar ler o arquivo inteiro antes
 * de saber as dimensões/duração. Bug real já visto aqui: o botão de tela
 * cheia do player simplesmente não funcionava nesses vídeos, especialmente
 * no Safari/iPhone. -c copy: sem recodificar, sem perder qualidade, só
 * reordena os blocos do arquivo (mesma técnica do "faststart" do ffmpeg).
 *
 * Se o ffmpeg falhar por qualquer motivo (formato não suportado, binário
 * ausente no ambiente etc.), devolve o buffer ORIGINAL sem quebrar o
 * upload — essa otimização nunca pode ser o motivo de um vídeo não subir. */
export async function remuxParaFaststart(buffer: Buffer, nomeArquivo: string): Promise<Buffer> {
  if (!ffmpegPath) return buffer;
  const extensao = path.extname(nomeArquivo) || ".mp4";
  const id = randomUUID();
  const tmpIn = path.join(tmpdir(), `faststart-in-${id}${extensao}`);
  const tmpOut = path.join(tmpdir(), `faststart-out-${id}${extensao}`);
  try {
    await writeFile(tmpIn, buffer);
    await execFileAsync(ffmpegPath, ["-y", "-i", tmpIn, "-c", "copy", "-movflags", "+faststart", tmpOut]);
    return await readFile(tmpOut);
  } catch {
    return buffer;
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  }
}
