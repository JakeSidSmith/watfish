import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import init, { QUESTIONS, writeFileCallback } from '../src/init';
import * as logger from '../src/logger';
import mockStd from './mocks/std';

describe('init.ts', () => {

  beforeEach(() => {
    QUESTIONS.forEach((question) => {
      if (typeof question.condition === 'function') {
        spyOn(question, 'condition').and.callThrough();
      }
      spyOn(question, 'callback').and.callThrough();
    });

    spyOn(process, 'exit');
    spyOn(process, 'cwd').and.returnValue('directory');
    spyOn(logger, 'log');
  });

  it('should ask questions & output a config file', () => {
    const answers = [
      'my-process',
      'my-url',
      'y',
    ];

    mockStd(answers);

    init();

    QUESTIONS.forEach((question, index) => {
      const message = typeof question.message === 'function' ? question.message() : question.message;

      expect(process.stdin.resume).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(message + ' ');
      if (typeof question.condition === 'function') {
        expect(question.condition).toHaveBeenCalled();
      }
      expect(question.callback).toHaveBeenCalledWith(answers[index]);
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'directory/wtf.json',
      JSON.stringify(
        {
          routes: [
            {
              process: 'my-process',
              url: 'my-url',
            },
          ],
        },
        undefined,
        2
      ) + '\n',
      UTF8,
      writeFileCallback
    );
  });

  it('should ask questions & output a config file (no process value)', () => {
    const answers = [
      '',
      'my-url',
      'y',
    ];

    mockStd(answers);

    init();

    QUESTIONS.forEach((question, index) => {
      if (index === 0) {
        const message = typeof question.message === 'function' ? question.message() : question.message;

        expect(process.stdin.resume).toHaveBeenCalled();
        expect(logger.log).toHaveBeenCalledWith(message + ' ');
      }

      if (typeof question.condition === 'function') {
        expect(question.condition).toHaveBeenCalled();
      }

      if (index === 1) {
        expect(question.callback).not.toHaveBeenCalled();
      }
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'directory/wtf.json',
      JSON.stringify(
        {
          routes: [],
        },
        undefined,
        2
      ) + '\n',
      UTF8,
      writeFileCallback
    );
  });

  it('should exit if config is incorrect', () => {
    const answers = [
      'my-process',
      'my-url',
      'n',
    ];

    mockStd(answers);

    init();

    expect(process.exit).toHaveBeenCalled();
  });

  it('should exit if config is incorrect (no process value)', () => {
    const answers = [
      '',
      'n',
    ];

    mockStd(answers);

    init();

    expect(process.exit).toHaveBeenCalled();
  });

  describe('writeFileCallback', () => {

    it('should output a success message', () => {
      writeFileCallback();

      expect(logger.log).toHaveBeenCalledWith('wtf.json written to ~/wtf.json');
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should exit on error', () => {
      writeFileCallback(new Error('WTF'));

      expect(logger.log).toHaveBeenCalledWith('WTF');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
