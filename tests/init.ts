import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import * as init from '../src/init';
import {
  askQuestions,
  QUESTIONS,
  writeFile,
  writeFileCallback,
} from '../src/init';
import * as logger from '../src/logger';
import * as utils from '../src/utils';
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

  describe('init', () => {

    beforeEach(() => {
      spyOn(init, 'askQuestions');
    });

    it('should ask questions without an existing config', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'error/wtf.json');

      init.default();

      expect(logger.log).toHaveBeenCalledWith('No wtf.json found at error/wtf.json. I\'ll create that for you');
      expect(init.askQuestions).toHaveBeenCalledWith(QUESTIONS, writeFile);
    });

    it('should ask questions when config exists', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'empty/wtf.json');

      init.default();

      expect(logger.log).not.toHaveBeenCalled();
      expect(init.askQuestions).toHaveBeenCalledWith(QUESTIONS, writeFile);
    });

    it('should exit if config is invalid', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'invalid/wtf.json');

      init.default();

      expect(logger.log).toHaveBeenCalledWith('Invalid wtf.json at invalid/wtf.json');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

  });

  describe('askQuestions', () => {

    it('should ask questions & output a config file', () => {
      const answers = [
        'my-process',
        'my-url',
        'y',
      ];

      mockStd(answers);

      askQuestions(QUESTIONS, writeFile);

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
        '~/wtf.json',
        JSON.stringify(
          {
            directory: {
              routes: {
                'my-process': 'my-url',
              },
            },
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

      askQuestions(QUESTIONS, writeFile);

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
        '~/wtf.json',
        JSON.stringify(
          {
            directory: {
              routes: {},
            },
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

      askQuestions(QUESTIONS, writeFile);

      expect(process.exit).toHaveBeenCalled();
    });

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
