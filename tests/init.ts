import * as init from '../src/init';
import mockStd from './mocks/std';

describe('init.ts', () => {

  beforeAll(() => {
    init.QUESTIONS.forEach((question) => {
      spyOn(question, 'condition').and.callThrough();
      spyOn(question, 'callback').and.callThrough();
    });
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

    expect(result).toBe(
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
      )
    );
  });
});
