

export function omitKeys<T extends object, K extends keyof T>
(obj: T, keysToOmit: readonly K[]): Omit<T,K> {
    const ret = {} as Omit<T, K>;

    for (const key in obj){
        if (!keysToOmit.includes(key as any)){
            (ret as any)[key] = obj[key];
        }
    }
    return (ret);
}