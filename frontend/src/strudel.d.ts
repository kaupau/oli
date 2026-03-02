declare module '@strudel/core' {
  export function evaluate(code: string): Promise<any>
  export function repl(options?: any): any
}

declare module '@strudel/webaudio' {
  export function webaudioOutput(hap: any, deadline: number, hapDuration: number, cps: number, t: number): void
  export function webaudioRepl(options?: any): any
}

declare module '@strudel/mini' {
  export function mini(input: string): any
}

declare module 'superdough' {
  export function registerSynthSounds(): void
  export function registerZZFXSounds(): void
  export function samples(sampleMap: any, baseUrl?: string, options?: any): Promise<void>
  export function initAudioOnFirstClick(options?: any): void
  export function initAudio(options?: any): Promise<void>
}
