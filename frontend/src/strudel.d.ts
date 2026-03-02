declare module '@strudel/core' {
  export function evaluate(code: string): Promise<any>
  export function repl(options?: any): any
  export function evalScope(...modules: any[]): Promise<any>
  export const controls: any
  export const sound: any
  export const note: any
  export const stack: any
  export const Pattern: any
}

declare module '@strudel/webaudio' {
  export function webaudioOutput(hap: any, deadline: number, hapDuration: number, cps: number, t: number): void
  export function webaudioRepl(options?: any): any
}

declare module '@strudel/mini' {
  export function mini(input: string): any
  export function miniAllStrings(): void
}

declare module 'superdough' {
  export function registerSynthSounds(): void
  export function registerZZFXSounds(): void
  export function samples(sampleMap: any, baseUrl?: string, options?: any): Promise<void>
  export function initAudioOnFirstClick(options?: any): void
  export function initAudio(options?: any): Promise<void>
  export function getAudioContext(): AudioContext
  export function getSuperdoughAudioController(): {
    output: {
      destinationGain: GainNode
    }
  }
}
