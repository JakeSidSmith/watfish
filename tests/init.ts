import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import * as init from '../src/init';
import mockStd from './mocks/std';

describe('init.ts', () => {

  beforeAll(() => {
    init.QUESTIONS.forEach((question) => {
      spyOn(question, 'condition').and.callThrough();
      spyOn(question, 'callback').and.callThrough();
    });

    process.cwd = () => 'directory';

    spyOn(fs, 'writeFile');
  });

  it('should ask questions & output a config file', () => {
    spyOn(process.stderr, 'write');

    const answers = [
      'my-process',
      'my-url',
    ];

    mockStd(answers);

    const result = init.default();

    init.QUESTIONS.forEach((question, index) => {
      expect(process.stderr.write).toHaveBeenCalledWith(question.message);
      expect(question.condition).toHaveBeenCalledWith(answers[index]);
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
});
