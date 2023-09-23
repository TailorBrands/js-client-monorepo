import { captureDiagnostics } from './Diagnostics';
import { errorBoundary } from './ErrorBoundary';

type Target = { prototype: unknown };

export function Monitored<T extends Target>(target: T, ..._args: unknown[]): T {
  for (const propertyName of Object.getOwnPropertyNames(target.prototype)) {
    const desc = Object.getOwnPropertyDescriptor(
      target.prototype,
      propertyName,
    );
    const isMethod = desc && desc.value instanceof Function;

    if (propertyName === 'constructor' || !isMethod) {
      continue;
    }

    Object.defineProperty(
      target.prototype,
      propertyName,
      _generateDescriptor(propertyName, desc),
    );
  }

  return target;
}

function _generateDescriptor(
  propertyKey: string,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  const original = descriptor.value as (...args: unknown[]) => unknown;

  descriptor.value = function (...args: unknown[]) {
    return errorBoundary(propertyKey, () =>
      captureDiagnostics(() => original.apply(this, args)),
    );
  };

  return descriptor;
}
