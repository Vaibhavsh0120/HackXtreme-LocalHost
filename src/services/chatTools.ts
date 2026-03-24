import { RunAnywhere, type ToolDefinition, type ToolExecutor } from '@runanywhere/core';

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a given city',
    parameters: [
      {
        name: 'city',
        type: 'string',
        description: 'The city name, e.g. "San Francisco"',
        required: true,
      },
      {
        name: 'unit',
        type: 'string',
        description: 'Temperature unit: "celsius" or "fahrenheit"',
        required: false,
        defaultValue: 'celsius',
        enum: ['celsius', 'fahrenheit'],
      },
    ],
  },
  {
    name: 'calculate',
    description: 'Perform a mathematical calculation',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: 'A math expression to evaluate, e.g. "2 + 2"',
        required: true,
      },
    ],
  },
  {
    name: 'get_time',
    description: 'Get the current date and time for a timezone',
    parameters: [
      {
        name: 'timezone',
        type: 'string',
        description: 'IANA timezone, e.g. "America/New_York"',
        required: false,
        defaultValue: 'UTC',
      },
    ],
  },
];

export const evaluateMathExpression = (expression: string): number => {
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g);
  if (!tokens || tokens.join('') !== expression.replace(/\s+/g, '')) {
    throw new Error('Invalid expression');
  }

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
  };

  const values: number[] = [];
  const operators: string[] = [];

  const applyOperator = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();

    if (!operator || left === undefined || right === undefined) {
      throw new Error('Malformed expression');
    }

    switch (operator) {
      case '+':
        values.push(left + right);
        break;
      case '-':
        values.push(left - right);
        break;
      case '*':
        values.push(left * right);
        break;
      case '/':
        values.push(left / right);
        break;
      case '%':
        values.push(left % right);
        break;
      default:
        throw new Error('Unsupported operator');
    }
  };

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      values.push(Number(token));
      continue;
    }

    if (token === '(') {
      operators.push(token);
      continue;
    }

    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        applyOperator();
      }

      if (operators.pop() !== '(') {
        throw new Error('Mismatched parentheses');
      }

      continue;
    }

    while (
      operators.length > 0 &&
      operators[operators.length - 1] !== '(' &&
      precedence[operators[operators.length - 1]] >= precedence[token]
    ) {
      applyOperator();
    }

    operators.push(token);
  }

  while (operators.length > 0) {
    if (operators[operators.length - 1] === '(') {
      throw new Error('Mismatched parentheses');
    }

    applyOperator();
  }

  if (values.length !== 1) {
    throw new Error('Malformed expression');
  }

  return values[0];
};

const mockWeather = async (args: Record<string, unknown>) => {
  const city = (args.city as string) || 'Unknown';
  const unit = (args.unit as string) || 'celsius';
  const temp = Math.floor(Math.random() * 30) + 5;

  return {
    city,
    temperature: unit === 'fahrenheit' ? Math.round(temp * 1.8 + 32) : temp,
    unit,
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 60) + 30,
  };
};

const mockCalculate = async (args: Record<string, unknown>) => {
  const expression = (args.expression as string) || '0';

  try {
    const sanitized = expression.replace(/[^0-9+\-*/().% ]/g, '');
    const result = evaluateMathExpression(sanitized);
    return { expression, result };
  } catch {
    return { expression, error: 'Could not evaluate expression' };
  }
};

const mockGetTime = async (args: Record<string, unknown>) => {
  const timezone = (args.timezone as string) || 'UTC';

  try {
    const now = new Date().toLocaleString('en-US', { timeZone: timezone });
    return { timezone, datetime: now };
  } catch {
    return { timezone, datetime: new Date().toISOString() };
  }
};

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  get_weather: mockWeather,
  calculate: mockCalculate,
  get_time: mockGetTime,
};

export const registerChatTools = (onToolExecution?: (toolName: string) => void) => {
  RunAnywhere.clearTools();

  CHAT_TOOLS.forEach(tool => {
    const executor = TOOL_EXECUTORS[tool.name];
    if (!executor) {
      throw new Error(`No executor registered for tool: ${tool.name}`);
    }

    RunAnywhere.registerTool(tool, async args => {
      onToolExecution?.(tool.name);
      return executor(args);
    });
  });

  return CHAT_TOOLS;
};
