import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import * as init from '../src/init';
import mockStd from './mocks/std';

type WriteFileCallback = (error?: NodeJS.ErrnoException) => void;

describe('init.ts', () => {

  beforeEach(() => {
    init.QUESTIONS.forEach((question) => {
      spyOn(question, 'condition').and.callThrough();
      spyOn(question, 'callback').and.callThrough();
    });

    spyOn(process, 'cwd').and.returnValue('directory');
    spyOn(process, 'exit');
    spyOn(fs, 'writeFile').and.callFake(
      (path: string, data: string, format: string, callback: WriteFileCallback) => {
        callback();
      }
    );
  });

  it('should ask questions & output a config file', () => {
    spyOn(process.stderr, 'write');

    const answers = [
      'my-process',
      'my-url',
    ];

    mockStd(answers);

    init.default();

    init.QUESTIONS.forEach((question, index) => {
      expect(process.stdin.resume).toHaveBeenCalled();
      expect(process.stderr.write).toHaveBeenCalledWith(question.message + ' ');
      expect(question.condition).toHaveBeenCalled();
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
      ),
      UTF8,
      init.writeFileCallback
    );
  });

  it('should ask questions & output a config file (no process value)', () => {
    spyOn(process.stderr, 'write');

    const answers = [
      '',
      'my-url',
    ];

    mockStd(answers);

    init.default();

    init.QUESTIONS.forEach((question, index) => {
      if (index === 0) {
        expect(process.stdin.resume).toHaveBeenCalled();
        expect(process.stderr.write).toHaveBeenCalledWith(question.message + ' ');
      }

      expect(question.condition).toHaveBeenCalled();

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
      ),
      UTF8,
      init.writeFileCallback
    );
  });

  describe('writeFileCallback', () => {

    beforeEach(() => {
      spyOn(process.stderr, 'write');
    });

    it('should output a success message', () => {
      init.writeFileCallback();

      expect(process.stderr.write).toHaveBeenCalledWith('wtf.json written to directory/wtf.json\n');
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should exit on error', () => {
      init.writeFileCallback(new Error('WTF'));

      expect(process.stderr.write).toHaveBeenCalledWith('WTF');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
