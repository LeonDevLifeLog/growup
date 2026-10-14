function withValues(fields, answers) {
  return fields.map(field => {
    const value = answers[field.id] === undefined ? '' : answers[field.id];
    const options = (field.options || []).map(option => ({ ...option, key: String(option.value), checked: Array.isArray(value) && value.map(String).includes(String(option.value)) }));
    const selectedIndex = options.findIndex(option => String(option.value) === String(value));
    const maxlength = field.type === 'text' || field.type === 'textarea' ? (field.maxLength || field.max || (field.type === 'textarea' ? 2000 : 500)) : 500;
    return { ...field, maxlength, value, options, pickerOptions: [{ value: '', label: '请选择' }, ...options], selectedIndex: selectedIndex + 1, selectedLabel: selectedIndex >= 0 ? options[selectedIndex].label : '请选择', inputType: field.type === 'number' ? 'digit' : 'text' };
  });
}

function validate(fields, raw) {
  const answers = {};
  for (const field of fields) {
    const value = raw[field.id];
    const empty = value === undefined || value === null || value === '' || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
    if (empty) {
      if (field.required) throw new Error('请填写「' + field.label + '」');
      continue;
    }
    if (field.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error('「' + field.label + '」需要填写数字');
      if (field.min !== undefined && number < field.min) throw new Error('「' + field.label + '」不能小于 ' + field.min);
      if (field.max !== undefined && number > field.max) throw new Error('「' + field.label + '」不能大于 ' + field.max);
      if (field.step !== undefined) {
        const steps = (number - (field.min || 0)) / field.step;
        if (Math.abs(steps - Math.round(steps)) > 0.000001) throw new Error('「' + field.label + '」请按 ' + field.step + ' 的步长填写');
      }
      answers[field.id] = number;
    } else if (field.type === 'multi') {
      if (!Array.isArray(value)) throw new Error('请重新选择「' + field.label + '」');
      answers[field.id] = value;
    } else {
      const answer = typeof value === 'string' ? value.trim() : value;
      const limit = field.maxLength || field.max;
      if ((field.type === 'text' || field.type === 'textarea') && limit && answer.length > limit) throw new Error('「' + field.label + '」不能超过 ' + limit + ' 字');
      answers[field.id] = answer;
    }
  }
  return answers;
}

function reportView(value, fallbackTitle) {
  if (!value) return null;
  if (typeof value === 'string') return { title: fallbackTitle, summary: value, metrics: [], sections: [], notice: '' };
  return { title: value.title || fallbackTitle, summary: value.summary || '', metrics: value.metrics || [], sections: value.sections || [], notice: value.notice || '' };
}

module.exports = { withValues, validate, reportView };
