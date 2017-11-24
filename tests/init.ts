import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import init, { QUESTIONS, writeFileCallback } from '../src/init';
import mockStd from './mocks/std';

describe('init.ts', () => {

  beforeEach(() => {
    QUESTIONS.forEach((question) => {
      if (typeof question.condition === 'function') {
        spyOn(question, 'condition').and.callThrough();
      }
      spyOn(question, 'callback').and.callThrough();
    });

    spyOn(process, 'cwd').and.returnValue('directory');
    spyOn(process, 'exit');
  });

  it('should ask questions & output a config file', () => {
    spyOn(process.stderr, 'write');

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
      expect(process.stderr.write).toHaveBeenCalledWith(message + ' ');
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
    spyOn(process.stderr, 'write');

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
        expect(process.stderr.write).toHaveBeenCalledWith(message + ' ');
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
    spyOn(process.stderr, 'write');

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
    spyOn(process.stderr, 'write');

    const answers = [
      '',
      'n',
    ];

    mockStd(answers);

    init();

    expect(process.exit).toHaveBeenCalled();
  });

  describe('writeFileCallback', () => {

    beforeEach(() => {
      spyOn(process.stderr, 'write');
    });

    it('should output a success message', () => {
      writeFileCallback();

      expect(process.stderr.write).toHaveBeenCalledWith('wtf.json written to directory/wtf.json\n');
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should exit on error', () => {
      writeFileCallback(new Error('WTF'));

      expect(process.stderr.write).toHaveBeenCalledWith('WTF');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
