class base_node
{
  constructor(i, o, extra = {})
  {
    this.input_len = i;
    this.output_len = o;
    this.inputs = new Array(i);
    this.outputs = new Array(o);
    for (let j = 0; j < i; j++) this.inputs[j] = new Object, Object.assign(this.inputs[j], { node: null, port: -1 });
    for (let j = 0; j < o; j++) this.outputs[j] = new Object, Object.assign(this.outputs[j], { node: null, port: -1 });
    this.called = false;
    this.cached_values = new Array(o).fill(0);
    this.extra = extra;
  }
  connect_input(port_a, node, port_b)
  {
    this.inputs[port_a].node = node;
    this.inputs[port_a].port = port_b;
    node.outputs[port_b].node = this;
    node.outputs[port_b].port = port_a;
  }
  get_input_value(port)
  {
    if (this.inputs[port].node) return this.inputs[port].node.get_output_value(this.inputs[port].port);
    return 0;
  }
  get_output_value(port)
  {
    return this.cached_values[port];
  }
  calculate_inputs()
  {
    for (let i = 0; i < this.input_len; i++)
      if (this.inputs[i].node) this.inputs[i].node.calculate();
  }
  copy_cache(output)
  {
    for (let i = 0; i < this.output_len; i++) output[i] = this.cached_values[i];
  }
  reset()
  {
    this.called = false;
    for (let i = 0; i < this.output_len; i++) this.cached_values[i] = 0;
  }
  reset_all()
  {
    this.called = false;
    for (let i = 0; i < this.input_len; i++)
      if (this.inputs[i].node && this.inputs[i].node.called) this.inputs[i].node.reset_all();
  }
}

class const_node extends base_node
{
  // extra.type can be blank, time or freq
  constructor(n, extra)
  {
    super(0, 1, extra)
    this.n = n;
  }
  calculate()
  {
    if (this.called) return;
    this.called = true;
    this.cached_values[0] = this.n;
  }
}

class split_node extends base_node
{
  constructor()
  {
    super(1, 2)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.cached_values[1] = this.get_input_value(0);
  }
}

class add_node extends base_node
{
  constructor()
  {
    super(2, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.get_input_value(0) + this.get_input_value(1);
  }
}

class sub_node extends base_node
{
  constructor()
  {
    super(2, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.get_input_value(0) - this.get_input_value(1);
  }
}

class mul_node extends base_node
{
  constructor()
  {
    super(2, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.get_input_value(0) * this.get_input_value(1);
  }
}

class div_node extends base_node
{
  constructor()
  {
    super(2, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.get_input_value(0) / this.get_input_value(1);
  }
}

class sin_node extends base_node
{
  constructor()
  {
    super(1, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = Math.sin(this.get_input_value(0));
  }
}

class output_node extends base_node
{
  constructor()
  {
    super(1, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.get_input_value(0);
  }
}

class if_positive_node extends base_node
{
  constructor()
  {
    super(3, 1)
  }
  calculate()
  {
    if (this.called) return;
    this.calculate_inputs()
    this.called = true;
    this.cached_values[0] = this.get_input_value(0) > 0 ? this.get_input_value(1) : this.get_input_value(2);
  }
}