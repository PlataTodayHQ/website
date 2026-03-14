export interface IImageStorage {
  download(imageUrl: string): Promise<string | null>;
}
