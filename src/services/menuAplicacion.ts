import{
    Menu,
    MenuItem,
    PredefinedMenuItem,
    Submenu,
} from '@tauri-apps/api/menu'

export type MenuApplicationAction =
  | 'panel'
  | 'personal'
  | 'expedientes'
  | 'nueva-anotacion'
  | 'hoja-vida'
  | 'evint'
  | 'hc1'
  | 'hc2'
  | 'ham'
  | 'hapsem'
  | 'catalogos'
  | 'respaldos'
  | 'restaurar-respaldo'
  | 'configuracion'
  | 'manual'
  | 'acerca-de'

type MenuCallback = (
    action: MenuApplicationAction,
  ) => void

export async function configurarMenuAplicacion(
    onAction: MenuCallback,
):Promise<void>{
    const itemPanel =await MenuItem.new({
        id:'panel',
        text: 'Panel principal',
        action: () => onAction('panel'),
    })

    const itemPersonal = await MenuItem.new({
        id: 'personal',
        text: 'Personal calificado',
        action: () => onAction('personal'),
    })

    const itemExpedientes = await MenuItem.new({
        id:'expedientes',
        text:'Expedientes',
        action: () =>onAction('expedientes'),
    })

    const itemNuevaAnotacion = await MenuItem.new({
        id: 'nueva-anotacion',
        text: 'Nueva anotacion',
        action: ()=>onAction('nueva-anotacion'),
    })

    const itemHojaVida = await MenuItem.new({
        id:'hoja-vida',
        text:'Hoja de Vida',
        action: () => onAction('hoja-vida'),
    })
    const itemEvint = await MenuItem.new({
        id:'evint',
        text:'EVINT',
        action: () => onAction('evint'),
    })

    const itemHc1 = await MenuItem.new({
        id:'hc1',
        text:'HC1',
        action: () =>onAction('hc1'),
    })
    const itemHc2 = await MenuItem.new({
        id:'hc2',
        text:'HC2',
        action: () =>onAction('hc2'),
    })
    const itemHam = await MenuItem.new({
        id:'ham',
        text:'HAM',
        action: () =>onAction('ham'),
    })
    const itemHapsem = await MenuItem.new({
        id:'hapsem',
        text:'HAPSEM',
        action: () =>onAction('hapsem'),
    })
    const itemCatalogos = await MenuItem.new({
        id:'catalogos',
        text:'Catalogos',
        action: () =>onAction('catalogos'),
    })

    const itemRespaldos = await MenuItem.new({
        id:'respaldos',
        text:'Crea una Copia de seguridad',
        action: () =>onAction('respaldos'),
    })

    const itemRestaurar = await MenuItem.new({
        id:'restaurar-respaldo',
        text:'Restaurar copia de seguridad',
        action: () =>onAction('restaurar-respaldo'),
    })
    const itemConfiguracion = await MenuItem.new({
        id:'configuracion',
        text:'Configuracion',
        action: () =>onAction('configuracion'),
    })
    const itemManual = await MenuItem.new({
        id:'manual',
        text:'Manual de usuario',
        action: () =>onAction('manual'),
    })
    const itemAcercaDe = await MenuItem.new({
        id:'acerca-de',
        text:'Acerca de HVDigital',
        action: () =>onAction('acerca-de'),
    })
    
    const separadorArchivo = await PredefinedMenuItem.new({
      item: 'Separator',
    })

    const separadorHerramientas = await PredefinedMenuItem.new({
      item: 'Separator',
    })

    const salir = await PredefinedMenuItem.new({
      item: 'Quit',
      text: 'Salir de HVDigital',
    })

    const submenuAplicacion = await Submenu.new({
        text: 'HVDigital',
        items:[
            itemAcercaDe,
            separadorHerramientas,
            itemConfiguracion,
            separadorArchivo,
            salir
        ],
    })
    const submenuArchivo =
    await Submenu.new({
      text: 'Archivo',
      items: [
        itemPanel,
        itemPersonal,
        itemExpedientes,
        separadorArchivo,
        itemNuevaAnotacion,
      ],
    })

    const submenuInstrumentos =
        await Submenu.new({
        text: 'Instrumentos',
        items: [
            itemHojaVida,
            itemEvint,
            itemHc1,
            itemHc2,
            itemHam,
            itemHapsem,
        ],
    })

    const submenuHerramientas =
        await Submenu.new({
        text: 'Herramientas',
        items: [
            itemCatalogos,
            itemRespaldos,
            itemRestaurar,
            separadorHerramientas,
            itemConfiguracion,
        ],
    })

    const submenuAyuda =
        await Submenu.new({
        text: 'Ayuda',
        items: [
            itemManual,
            itemAcercaDe,
        ],
    })

    const menu = await Menu.new({
        items: [
        submenuAplicacion,
        submenuArchivo,
        submenuInstrumentos,
        submenuHerramientas,
        submenuAyuda,
        ],
    })

  await menu.setAsAppMenu()
}