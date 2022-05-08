function generate_sound(audio_ctx, buf, events, end_node, length)
{
  let channel_data = buf.getChannelData(0);
  let evt_ptr = 0;
  let notes = new Array(128);
  for (let i = 0; i < 128; i++) notes[i] = { playing: false, t: 0, rt: 0, amp: 0, adsr_state: 0 };
  
  let time_nodes = [], freq_nodes = [];
  {
    // we do a bit of dfs-ing
    let stack = [end_node];
    while (stack.length)
    {
      let node = stack.pop();
      if (node.extra.type == "time") time_nodes.push(node);
      if (node.extra.type == "freq") freq_nodes.push(node);
      for (let i = node.input_len-1; i >= 0; i--)
        if (node.inputs[i].node) stack.push(node.inputs[i].node);
    }
  }
  
  for (let t = 0; t < length; t++)
  {
    for (let i = 0; i < 128; i++) notes[i].t++, notes[i].rt++;
    while (evt_ptr < events.length && t == events[evt_ptr].t)
    {
      switch (events[evt_ptr].instr)
      {
      case "note_on":
        notes[events[evt_ptr].param[0]].playing = true;
        notes[events[evt_ptr].param[0]].t = 0;
        break;
      case "note_off":
        notes[events[evt_ptr].param[0]].playing = false;
        notes[events[evt_ptr].param[0]].rt = 0;
        break;
      }
      evt_ptr++;
    }
    channel_data[t] = 0;
    for (let i = 0; i < 128; i++)
    {
      if (notes[i].amp)
      {
        end_node.reset_all();
        for (let j = 0; j < time_nodes.length; j++) time_nodes[j].n = notes[i].t / 44100;
        for (let j = 0; j < freq_nodes.length; j++) freq_nodes[j].n = 440 * Math.pow(1.0594630943592953, i - 69);
        end_node.calculate();
        channel_data[t] += 0.25 * notes[i].amp * end_node.get_output_value(0);
      }
      switch (notes[i].adsr_state)
      {
        case 0:
          if (notes[i].playing) notes[i].adsr_state++;
          break;
        case 1:
          notes[i].amp += 1 / 1000;
          if (notes[i].amp >= 1) notes[i].amp = 1, notes[i].adsr_state++;
          break;
        case 2:
          notes[i].amp -= 1 / 500;
          if (notes[i].amp <= 0.5) notes[i].amp = 0.5, notes[i].adsr_state++;
          break;
        case 3:
          if (!notes[i].playing) notes[i].adsr_state++;
          break;
        case 4:
          notes[i].amp -= 1 / 4000;
          if (notes[i].amp <= 0) notes[i].amp = 0, notes[i].adsr_state = 0;
          break;
      }
    }
  }
}

// this generates a sine wave with freq hz

function make_graph()
{
  let time = new const_node(0, { type: "time" });
  let freq = new const_node(0, { type: "freq" });
  let tau = new const_node(2 * Math.PI);
  let time_freq_mul = new mul_node;
  let tau_mul = new mul_node;
  let sin = new sin_node;
  let output = new output_node;
  time_freq_mul.connect_input(0, time, 0);
  time_freq_mul.connect_input(1, freq, 0);
  tau_mul.connect_input(0, time_freq_mul, 0);
  tau_mul.connect_input(1, tau, 0);
  sin.connect_input(0, tau_mul, 0);
  output.connect_input(0, sin, 0);
  return output;
}


function parse_event(str)
{
  let evts = str.split('\n').map(e => {
    let a = e.split(' ');
    return { t: Math.floor(+a[0] * 44100), instr: a[1], param: a.slice(2).map(e => +e) };
  });
  evts.sort((a, b) => a.t - b.t);
  return [evts, evts[evts.length - 1].t + 11025];
}

function parse_graph(str)
{
  let buffer = {};
  let cmds = str.split('\n').map(e => e.split(' '));
  let end_node;
  for (let i = 0; i < cmds.length; i++)
  {
    if (cmds[i][0])
      switch (cmds[i][0])
      {
      case "node":
        cmds[i][1] = "$".concat(cmds[i][1]);
        switch (cmds[i][2])
        {
          case "const":
            if (cmds[i].length == 5) buffer[cmds[i][1]] = new const_node(+cmds[i][3], { type: cmds[i][4] });
            else if (cmds[i].length == 4) buffer[cmds[i][1]] = new const_node(+cmds[i][3]);
            break;
          case "split":
            buffer[cmds[i][1]] = new split_node;
            break;
          case "add":
            buffer[cmds[i][1]] = new add_node;
            break;
          case "sub":
            buffer[cmds[i][1]] = new sub_node;
            break;
          case "mul":
            buffer[cmds[i][1]] = new mul_node;
            break;
          case "div":
            buffer[cmds[i][1]] = new div_node;
            break;
          case "sin":
            buffer[cmds[i][1]] = new sin_node;
            break;
          case "if+":
            buffer[cmds[i][1]] = new if_positive_node;
            break;
          case "output":
            buffer[cmds[i][1]] = new output_node;
            end_node = buffer[cmds[i][1]];
            break;
        }
        break;
      case "connect":
        buffer["$".concat(cmds[i][1])].connect_input(+cmds[i][2], buffer["$".concat(cmds[i][3])], +cmds[i][4]);
        break;
      default:
        break;
      }
  }
  return end_node;
}

const audio_ctx = new AudioContext();
let buf, source;
function generate()
{
  let [evts, length] = parse_event(document.getElementById("evts").value);
  let graph = parse_graph(document.getElementById("graph").value);
  console.log(evts, graph);
  buf = audio_ctx.createBuffer(1, length, 44100);
  generate_sound(audio_ctx, buf, evts, graph, length);
}

function play()
{
  source = audio_ctx.createBufferSource();
  source.buffer = buf;
  source.connect(audio_ctx.destination);
  source.start();
}