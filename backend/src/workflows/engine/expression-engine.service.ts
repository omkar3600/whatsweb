import { Injectable, Logger } from '@nestjs/common';
import * as jexl from 'jexl';

@Injectable()
export class ExpressionEngineService {
  private readonly logger = new Logger(ExpressionEngineService.name);
  private jexlInstance: any;

  constructor() {
    this.jexlInstance = new (jexl as any).Jexl();
    this.registerCustomFunctions();
  }

  private registerCustomFunctions() {
    // Strings
    this.jexlInstance.addTransform('upper', (val: string) => (val ? String(val).toUpperCase() : ''));
    this.jexlInstance.addTransform('lower', (val: string) => (val ? String(val).toLowerCase() : ''));
    this.jexlInstance.addTransform('trim', (val: string) => (val ? String(val).trim() : ''));
    this.jexlInstance.addTransform('concat', (val1: string, val2: string) => `${val1 || ''}${val2 || ''}`);
    this.jexlInstance.addTransform('substring', (val: string, start: number, end?: number) => (val ? String(val).substring(start, end) : ''));
    this.jexlInstance.addTransform('contains', (val: string, search: string) => (val ? String(val).includes(search) : false));
    this.jexlInstance.addTransform('replace', (val: string, search: string, replaceWith: string) => (val ? String(val).replace(new RegExp(search, 'g'), replaceWith) : ''));

    // Math
    this.jexlInstance.addTransform('round', (val: number) => Math.round(Number(val) || 0));
    this.jexlInstance.addTransform('ceil', (val: number) => Math.ceil(Number(val) || 0));
    this.jexlInstance.addTransform('floor', (val: number) => Math.floor(Number(val) || 0));
    this.jexlInstance.addTransform('add', (val: number, num: number) => (Number(val) || 0) + (Number(num) || 0));

    // Dates
    this.jexlInstance.addTransform('now', () => new Date().toISOString());
    this.jexlInstance.addTransform('addDays', (dateStr: string, days: number) => {
      const d = dateStr ? new Date(dateStr) : new Date();
      d.setDate(d.getDate() + (days || 0));
      return d.toISOString();
    });

    // Arrays
    this.jexlInstance.addTransform('length', (arr: any) => (Array.isArray(arr) ? arr.length : 0));
    this.jexlInstance.addTransform('first', (arr: any) => (Array.isArray(arr) && arr.length > 0 ? arr[0] : null));
    this.jexlInstance.addTransform('last', (arr: any) => (Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null));

    // Logic
    this.jexlInstance.addTransform('if', (cond: boolean, trueVal: any, falseVal: any) => (cond ? trueVal : falseVal));
  }

  /**
   * Evaluates a string that may contain {{...}} expressions
   */
  async evaluateString(template: string, context: Record<string, any>): Promise<string> {
    if (!template || typeof template !== 'string') return template;

    const regex = /\{\{(.*?)\}\}/g;
    let result = template;

    let match;
    const matches: { original: string; expression: string }[] = [];

    while ((match = regex.exec(template)) !== null) {
      matches.push({ original: match[0], expression: match[1] });
    }

    for (const m of matches) {
      try {
        const evaluated = await this.jexlInstance.eval(m.expression, context);
        result = result.replace(m.original, evaluated !== undefined && evaluated !== null ? String(evaluated) : '');
      } catch (e) {
        this.logger.warn(`Failed to evaluate expression: ${m.expression}`, e);
      }
    }

    return result;
  }

  /**
   * Evaluates a pure logical or mathematical expression
   */
  async evaluateCondition(expression: string, context: Record<string, any>): Promise<any> {
    try {
      return await this.jexlInstance.eval(expression, context);
    } catch (e) {
      this.logger.error(`Failed to evaluate condition: ${expression}`, e);
      return false;
    }
  }
}
