/* eslint-disable no-restricted-globals */
import React, { Component } from "react";
import { IoMdTrash } from 'react-icons/io';
import { MdEdit } from "react-icons/md";
import ProjectService from "../../Application/Project/ProjectService";
import { ConfigurationInformation } from "../../Domain/ProductLineEngineering/Entities/ConfigurationInformation";

interface Props {
  className: string,
  onConfigurationSelected?: any;
  projectService: ProjectService;
  reload?: boolean;
}
interface State {
  configurations?: ConfigurationInformation[],
}

class ConfigurationManagement extends Component<Props, State> {

  constructor(props: any) {
    super(props);
    this.state = {
      configurations: null
    };
  }

  componentDidMount(): void {
    this.getAllConfigurations();
  }

  getAllConfigurations() {
    // Emitir el evento para obtener todas las configuraciones
    this.props.projectService.socket.emit('getAllConfigurations', {
      workspaceId: this.props.projectService.workspaceId,
    });
  
    // Listener para recibir las configuraciones desde el servidor
    this.props.projectService.socket.on('allConfigurationsReceived', (configurations) => {
      console.log('Configurations received:', configurations); // Verificar qué datos se reciben
      this.setState({ configurations });
    });
  }

  btnConfiguration_onClic(e) {
    e.preventDefault();
    let id = e.target.attributes["data-id"].value;
    if (this.props.onConfigurationSelected) {
      this.props.onConfigurationSelected({
        target: this,
        value: id
      });
    }

    // Emitir el evento para aplicar la configuración
    this.props.projectService.socket.emit('configurationApplied', {
      configurationId: id,
      workspaceId: this.props.projectService.workspaceId,
    });
  }

  btnEditConfiguration_onClic(e) {
    e.preventDefault(); 
  }

  btnDeleteConfiguration_onClic(e) {
    e.preventDefault(); 
    if (!confirm("¿Do you really want to delete the configuration?")) {
      return;
    }
    let htmlElement = e.target;
    while (!htmlElement.attributes["data-id"]) {
      htmlElement = htmlElement.parentElement;
    }
    let id = htmlElement.attributes["data-id"].value;
    if (this.props.onConfigurationSelected) {
      this.props.onConfigurationSelected({
        target: this,
        value: id
      });
    }

    // Emitir el evento para eliminar la configuración
    this.props.projectService.socket.emit('configurationDeleted', {
      configurationId: id,
      workspaceId: this.props.projectService.workspaceId,
    });
  }

  renderProjects() {
    let elements = [];
    if (this.state.configurations) {
      for (let i = 0; i < this.state.configurations.length; i++) {
        let configurations = this.state.configurations[i];
        const element = (
          <li key={configurations.id}>
            <a title="Delete" href="#" className="link-project" data-id={configurations.id} onClick={this.btnDeleteConfiguration_onClic.bind(this)}><IoMdTrash /></a>
            <a href="#" className="link-project" data-id={configurations.id} onClick={this.btnConfiguration_onClic.bind(this)}>{configurations.name}</a>
          </li>
        );
        elements.push(element);
      }
    }
    return (
      <ul>{elements}</ul>
    );
  }

  render() {
    return (
      <div className={this.props.className}>
        {this.renderProjects()}
      </div>
    );
  }
}

export default ConfigurationManagement;
